# Development

## Prerequisites

Developing Hive locally requires you to have the following software installed locally:

- Node.js 18 (or `nvm` or `fnm`)
- pnpm v8
- Docker

## Setup Instructions

- Clone the repository locally
- Make sure to install the recommended VSCode extensions (defined in `.vscode/extensions.json`)
- In the root of the repo, run `nvm use` to use the same version of node as mentioned
- Create `.env` file in the root, and use the following:

```dotenv
ENVIRONMENT=local
```

- Run `pnpm i` at the root to install all the dependencies and run the hooks
- Run `pnpm local:setup` to run Docker compose dependencies, create databases and migrate database
- Run `pnpm generate` to generate the typings from the graphql files (use `pnpm graphql:generate` if
  you only need to run GraphQL Codegen)
- Run `pnpm build` to build all services
- Click on `Start Hive` in the bottom bar of VSCode
- Open the UI (`http://localhost:3000` by default) and Sign in with any of the identity provider
- Once this is done, you should be able to log in and use the project
- Once you generate the token against your organization/personal account in hive, the same can be
  added locally to `hive.json` within `packages/libraries/cli` which can be used to interact via the
  hive cli with the registry (Use `http://localhost:3001/graphql` as the `registry.endpoint` value
  in `hive.json`)
- Now you can use Hive locally. All other steps in this document are optional and only necessary if
  you work on specific features.

## Development Seed

We have a script to feed your local instance of Hive with initial seed data. This step is optional.

1. Use `Start Hive` to run your local Hive instance
2. Make sure `usage` and `usage-ingestor` are running as well (with `pnpm dev`)
3. Open Hive app, create a project and a target, then create a token
4. Run the seed script: `TOKEN="MY_TOKEN_HERE" pnpm seed`
5. This should report a dummy schema and some dummy usage data to your local instance of Hive,
   allowing you to test features e2e

> Note: You can set `STAGING=1` in order to target staging env and seed a target there. Same for
> development env, you can use `DEV=1`

> Note: You can set `FEDERATION=1` in order to publish multiple subgraphs.

> To send more operations and test heavy load on Hive instance, you can also set `OPERATIONS`
> (amount of operations in each interval round, default is `1`) and `INTERVAL` (frequency of sending
> operations, default: `1000`ms). For example, using `INTERVAL=1000 OPERATIONS=1000` will send 1000
> requests per second.

### Troubleshooting

We recommend the following flow if you are having issues with running Hive locally:

1. Stop all Docker containers: `docker kill $(docker ps -q)`
2. Clear all local Docker environment: `docker system prune --all --force --volumes`
3. Delete all generated local `.env` files: `find . -name '.env' | xargs rm`
4. Delete local `docker/.hive` and `docker/.hive-dev` dir used by Docker volumes.
5. Reinstall dependencies using `pnpm install`
6. Force-generate new `.env` files: `pnpm env:sync --force`

## Publish your first schema (manually)

1. Start Hive locally
2. Create a project and a target
3. Create a token from that target
4. Go to `packages/libraries/cli` and run `pnpm build`
5. Inside `packages/libraries/cli`, run:
   `pnpm start schema:publish --registry.accessToken "YOUR_TOKEN_HERE" --registry.endpoint "http://localhost:4000/graphql" examples/single.graphql`

### Setting up Slack App for developing

1. [Download](https://loophole.cloud/download) Loophole CLI (same as ngrok but supports non-random
   urls)
2. Log in to Loophole `$ loophole account login`
3. Start the proxy by running `$ loophole http 3000 --hostname hive-<your-name>` (@kamilkisiela I
   use `hive-kamil`). It creates `https://hive-<your-name>.loophole.site` endpoint.
4. Message @kamilkisiela and send him the url (He will update the list of accepted redirect urls in
   Slack App).
5. Update `APP_BASE_URL` in [`packages/web/app/.env`](./packages/web/app/.env) to the proxy URL
   (e.g. `https://hive-<your-name>.loophole.site`)
6. Run `packages/web/app` and open `https://hive-<your-name>.loophole.site`.

> We have a special Slack channel called `#hive-tests` to not spam people :)

### Setting up GitHub App for developing

1. Follow the steps above for Slack App
2. Update `Setup URL` in
   [GraphQL Hive Development](https://github.com/organizations/the-guild-org/settings/apps/graphql-hive-development)
   app and set it to `https://hive-<your-name>.loophole.site/api/github/setup-callback`

### Local OIDC Testing

The `docker-compose.dev.yml` files includes a mock OIDC server that can be used for testing the OIDC
login/logout flow locally. The server tuns on port `7043`.

Please make sure to set the `AUTH_ORGANIZATION_OIDC` environment variables for the `server` and
`app` to `"1"`.

You can use the following values for connecting an integration to an OIDC provider.

```
# Token Endpoint
http://localhost:7043/connect/token
# User Info Endpoint
http://localhost:7043/connect/userinfo
# Authorization Endpoint
http://localhost:7043/connect/authorize
# Client ID
implicit-mock-client
# Client Secret
client-credentials-mock-client-secret
```

For login use the following credentials.

```
# Username
test-user
# Password
password
```

### Run Hive

1. Click on Start Hive in the bottom bar of VSCode
2. Open the UI (`http://localhost:3000` by default) and register any email and password
3. Sending e-mails is mocked out during local development, so in order to verify the account find
   the verification link by visiting the email server's `/_history` endpoint -
   `http://localhost:6260/_history` by default.
   - Searching for `token` should help you find the link.
