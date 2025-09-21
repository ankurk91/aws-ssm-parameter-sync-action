# AWS Systems Manager Parameter Store Sync

[![tests](https://github.com/ankurk91/aws-ssm-parameter-sync-action/actions/workflows/tests.yaml/badge.svg)](https://github.com/ankurk91/aws-ssm-parameter-sync-action/actions)

A GitHub Action to sync parameters to AWS Systems Manager Parameter Store.

### Features

* Create or update parameters
* Delete orphan parameters
* This action assumes that all parameters are `SecureString`

### Usage

```yaml
on:
  push:
    branches:
      - main

jobs:
  Deployment:
    runs-on: ubuntu-latest

    steps:
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v5
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Sync SSM parameters
        uses: ankurk91/aws-ssm-parameter-sync-action@v1
        with:
          path_prefix: "/production/"
          parameters: >-
            DB_USER=${{ secrets.DB_USER }},
            DB_PASSWORD=${{ secrets.DB_PASSWORD }},
            DB_DEBUG=${{ vars.DB_DEBUG }},
```

### Inputs

| Name          | Required | Default | Description                    |
|---------------|----------|---------|--------------------------------|
| `path_prefix` | Yes      | `null`  | SSM path prefix                |
| `parameters`  | Yes      | `null`  | Comma separated key value pair |

### Notes

Your pipeline must be authenticated with these permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:DescribeParameters",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:PutParameter",
        "ssm:DeleteParameter",
        "ssm:DeleteParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/*"
    }
  ]
}
```

### Ref links

* https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html

### License

This repo is licensed under MIT [License](LICENSE.txt).
