# App Center Data Source for Grafana

## Summary

- [**Introduction**](#introduction)
- [**Getting Started**](#getting-started)
- [**Supported Operations**](#supported-operations)
- [**Feedback**](#feedback)
- [**Contributing**](#contributing)
- [**License**](#license)

## Introduction

### What is the App Center Data Source for Grafana?

The App Center Data Source for Grafana is a plug-in that allows users to build dashboards in Grafana using data from App Center.

### What Grafana version is supported?

Grafana 7.2 and later.

### What does the Data Source require to connect to the App Center?

The Data Source requires a App Center User API Token in order to connect to App Center API. This token can be generated on App Center Setting page (https://appcenter.ms/settings).

## Getting Started

### Install using `grafana-cli`

Use the `grafana-cli` tool to install from the commandline:

```bash
grafana-cli plugins install thalysantana-appcenter-datasource
```

### Run using `docker`

```bash
docker run -d -p 3000:3000 --name=grafana -e "GF_INSTALL_PLUGINS=thalysantana-appcenter-datasource" grafana/grafana
```

## Supported Operations

#### orgs - List available organizations. (table)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-orgs.png?raw=true)

#### apps - List availabe apps for the configured organization. (table)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-apps.png?raw=true)

### errorGroups - List error groups for the configured apps over a range period. (table)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-error-groups.png?raw=true)

### errors  - List errors for the configured apps over a range period. (table)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-errors.png?raw=true)

In order to list errors, App Center requires an error group id to be informed. 
This can be done by creating a variable errorGroupId on the Errors dashboard, and creating a link on the Error Groups dashboard to fill this variable.
Follow the steps below.

Variable creation

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-errors-variable-creation.png?raw=true)

Link creation

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-errors-link-creation-1.png?raw=true)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-errors-link-creation-2.png?raw=true)

### errorsCount - List errors count for the configured apps grouped by version. (graph)

![Query](https://github.com/thalysantana/grafana-appcenter-datasource/blob/main/src/img/screenshot-errors-count.png?raw=true)

## Feedback

I would love to hear from users, developers and the whole community interested by this plugin.

- Ask a question, request a new feature and file a bug with [GitHub issues](https://github.com/thalysantana/grafana-appcenter-datasource/issues/new).
- Star the repository to show your support.

## Contributing

- Fork the repository.
- Find an [issue](https://github.com/thalysantana/grafana-appcenter-datasource/issues) to work on and submit a pull request

## License

- Apache License Version 2.0, see [LICENSE](https://github.com/thalysantana/grafana-appcenter-datasource/blob/master/LICENSE)
