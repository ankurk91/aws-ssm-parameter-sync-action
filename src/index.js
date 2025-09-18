import {DeleteParameterCommand, GetParametersByPathCommand, PutParameterCommand, SSMClient} from "@aws-sdk/client-ssm";
import * as core from "@actions/core";
import process from "node:process";
import {parseParameters} from "./utils.js";

async function main() {
  try {
    const ssmClient = new SSMClient();

    // Get inputs from GitHub Actions
    const ssmPathPrefixInput = core.getInput('path-prefix');
    const parametersInput = core.getInput('parameters');

    // Validate required inputs
    if (!ssmPathPrefixInput) {
      core.setFailed('[Error] path-prefix input is required');
      process.exit(1);
    }

    core.info('Info: Normalizing input parameters...');

    // Validate and normalize parameters
    const params = parseParameters(parametersInput)

    if (core.isDebug()) {
      core.debug(`INPUT_PARAMS=${JSON.stringify(params)}`);
    }

    if (params.length === 0) {
      core.setFailed('[Error] parameters input is required');
      process.exit(1);
    }

    // Normalize SSM path prefix
    const ssmPathPrefix = ssmPathPrefixInput.endsWith('/')
      ? ssmPathPrefixInput
      : ssmPathPrefixInput + '/';

    core.info(`Info: Fetching parameters for prefix: ${ssmPathPrefix}`);

    // Get existing parameters
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

    // Process each parameter from input
    for (const {key, value} of params) {
      if (!key) continue;

      const fullParamName = `${ssmPathPrefix}${key}`;
      const existingParam = existingParameters.find(p => p.name === fullParamName);

      // If parameter doesn't exist, create it
      if (!existingParam) {
        core.notice(`[Notice] Parameter ${fullParamName} is missing in SSM. Creating it...`);
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
        core.notice(`[Notice] Updating ${fullParamName} (value changed).`);
        await ssmClient.send(new PutParameterCommand({
          Name: fullParamName,
          Value: value,
          Type: 'SecureString',
          Overwrite: true
        }));
      } else {
        core.info(`Info: Skipping ${fullParamName} (value unchanged).`);
      }
    }

    // Delete parameters that are not in the input
    let deletionFailed = false;

    for (const existingParam of existingParameters) {
      const shortName = existingParam.name.replace(ssmPathPrefix, '');
      const existsInInput = params.some(p => p.key === shortName);

      if (!existsInInput) {
        core.warning(`Deleting ${existingParam.name} (not found in inputs).`);
        try {
          await ssmClient.send(new DeleteParameterCommand({
            Name: existingParam.name
          }));
        } catch (error) {
          core.error(`[Error] Failed to delete ${existingParam.name}: ${error.message}`);
          deletionFailed = true;
          break;
        }
      }
    }

    if (deletionFailed) {
      core.setFailed('[Error] Aborting due to deletion failure.');
      process.exit(1);
    }

    core.info('Info: Parameter Store sync completed!');

  } catch (error) {
    core.setFailed(`[Error] ${error.message}`);
    process.exit(1);
  }
}

main();
