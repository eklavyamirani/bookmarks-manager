[![Docker Image CI](https://github.com/eklavyamirani/bookmarks-manager/actions/workflows/docker-image.yml/badge.svg)](https://github.com/eklavyamirani/bookmarks-manager/actions/workflows/docker-image.yml)
[![Publish Docker Image](https://github.com/eklavyamirani/bookmarks-manager/actions/workflows/publish-docker-image.yml/badge.svg)](https://github.com/eklavyamirani/bookmarks-manager/actions/workflows/publish-docker-image.yml)

## The goal of this project is to code with LLM. 
 - the devcontainer setup was manual.
 - the readme updates are manual.

### Progress:
![Wired up to the DB](docs/images/db_snapshot.png)
![After adding backend API](docs/images/progress.png)

## Prompts used
1. Rewrite this app in typescript
2. update the frontend application to implement a bookmark manager for web urls. I want the ability to list bookmarks and mark them as read. For the frontend app, create a new mock api to return the bookmarks. The bookmark has a url, a title, create_date, read_date.
    1. {One compiler error. copy pasted and resolved.}
3. now implement the api logic in the backend app and wire it up with the frontend app. For now, the backend app should use a mock api layer. the frontend app should have an option to use its mock api or to use the backend api.
    1. can you instead use the proxy setting on the frontend app to solve the cors issue?
4. Now, let's hook up the backend api to the postgres instance. The development config should allow switching between the mock bookmark repository and the real postgres instance.
    1. get the postgres user, password, database from environment variables
5. Create dockerfile to deploy the frontend and the backend app into a single container. Include all the environment variables used in the code base.
    1. {npm error. copy pasted, resolved.}
    2. {404 error on api call, copy pasted the response headers, nginx configuration updated.}
    3. move the docker related files to /deploy
    4. {copy pasted error due to incorrect paths after move}
    5. {manually removed the backend api port expose. removed the version on docker compose.}
6. create another github action to publish the docker image to github packages. The trigger is on new release.
7. in the backend app, remove default passwords.
8. change the code to also pull the postgres host from an environment variable.
9. also update the appsettings with the updated connection string template.
10. add the environment variable to .env_sample
11. can you also update the backend app to use the table name from an environment variable?
    1. {Failed. Sets the search path in the connection string, which is not correct.}
12. Add a host name property to postgres. This property should come from the dot env file.
    1. Use the specific property for POSTGRES HOST in ENV to get this property.
13. change this code to use db first entity approach

## Setup instructions
1. Setup the postgres config in .devcontainer/.postgres.env (copy the sample, rename it to .postgres.env and fill in the values)
2. Load the devcontainer

### create the react app in the container
```zsh
npx create-react-app <appname>
```

### create dotnet webapi
```zsh
dotnet new webapi -o <project_name> --use-controllers --use-program-main
```

### create dotnet gitignore
```zsh
dotnet new gitignore
```

### create new controller
```zsh
dotnet new apicontroller --actions --name <controller name>
```

## Deploy the app
```zsh
cd deploy
docker compose up --build
```
