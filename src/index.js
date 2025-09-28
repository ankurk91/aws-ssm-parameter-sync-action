import {DeleteParameterCommand, GetParametersByPathCommand, PutParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import * as core from "@actions/core";
import process from "node:process";
import {parseParameters} from "./utils.js";

async function run() {
  const ssmClient = new SSMClient();

  // Get inputs from GitHub Actions
  const ssmPathPrefixInput = core.getInput('path_prefix', {
    required: true
  });
  const parametersInput = core.getInput('parameters', {
    required: true
  });

  core.info('Normalizing input parameters...');

  // Validate and normalize parameters
  const params = parseParameters(parametersInput)

  if (core.isDebug()) {
    core.debug(`INPUT_PARAMS=${JSON.stringify(params)}`);
  }

  if (params.length === 0) {
    core.setFailed('parameters input is invalid.');
    process.exit(1);
  }

  // Normalize SSM path prefix
  const ssmPathPrefix = ssmPathPrefixInput.replace(/\/?$/, '/');

  core.info(`Fetching parameters for prefix: ${ssmPathPrefix}`);

  let existingParameters = [];
  let nextToken;

  do {
    const command = new GetParametersByPathCommand({
      Path: ssmPathPrefix,
      WithDecryption: true,
      Recursive: true,
      NextToken: nextToken
    });

    const response = await ssmClient.send(command);

    if (response.Parameters) {
      existingParameters.push(...response.Parameters.map(param => ({
        name: param.Name,
        value: param.Value
      })));
    }

    nextToken = response.NextToken;
  } while (nextToken);

  if (core.isDebug()) {
    core.debug(`EXISTING_PARAMETERS=${JSON.stringify(existingParameters)}`);
  }

  core.info(`Parameter Store sync starting...`);

  // Process each parameter from input
  for (const {key, value} of params) {
    if (!key) continue;

    const fullParamName = `${ssmPathPrefix}${key}`;
    const existingParam = existingParameters.find(p => p.name === fullParamName);

    // If parameter doesn't exist, create it
    if (!existingParam) {
      core.info(`Parameter ${fullParamName} is missing in SSM. Creating it...`);
      await ssmClient.send(new PutParameterCommand({
        Name: fullParamName,
        Value: value,
        Type: 'SecureString',
        Overwrite: true
      }));
      continue;
    }

    // If value changed, update it
    if (value !== existingParam.value) {
      core.info(`Updating ${fullParamName} (value changed).`);
      await ssmClient.send(new PutParameterCommand({
        Name: fullParamName,
        Value: value,
        Type: 'SecureString',
        Overwrite: true
      }));
    } else {
      core.info(`Skipping ${fullParamName} (value unchanged).`);
    }
  }

  // Delete parameters that are not in the input
  let deletionFailedCount = 0;

  core.info(`Checking for orphan parameters...`);
  for (const existingParam of existingParameters) {
    const shortName = existingParam.name.replace(ssmPathPrefix, '');
    const existsInInput = params.some(p => p.key === shortName);

    if (!existsInInput) {
      core.notice(`Deleting ${existingParam.name} (not found in inputs).`);
      try {
        await ssmClient.send(new DeleteParameterCommand({
          Name: existingParam.name
        }));
      } catch (error) {
        core.error(`Failed to delete ${existingParam.name}: ${error.message}`);
        deletionFailedCount++;
      }
    }
  }

  if (deletionFailedCount) {
    core.setFailed(`Failed to delete ${deletionFailedCount} parameter(s).`);
    process.exit(1);
  }

  core.info('Parameter Store sync completed!');
}

await run().catch(error => {
  core.setFailed(error);
});

