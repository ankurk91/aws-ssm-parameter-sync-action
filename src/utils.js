// Shamelessly copied from :)
// https://github.com/aws-actions/aws-cloudformation-github-deploy/blob/master/src/utils.ts
export function parseParameters(inputs) {
  const parameters = new Map();

  inputs
    .split(/,(?=(?:(?:[^"']*["|']){2})*[^"']*$)/g)
    .forEach(parameter => {
      const values = parameter.trim().split('=')
      const key = values[0]
      // Corrects values that have an = in the value
      const value = values.slice(1).join('=')
      let param = parameters.get(key)
      param = !param ? value : [param, value].join(',')
      // Remove starting and ending quotes
      if (
        (param.startsWith("'") && param.endsWith("'")) ||
        (param.startsWith('"') && param.endsWith('"'))
      ) {
        param = param.substring(1, param.length - 1)
      }
      parameters.set(key, param)
    })

  return [...parameters.keys()].map(key => {
    return {
      key: key,
      value: parameters.get(key)
    }
  })
}
