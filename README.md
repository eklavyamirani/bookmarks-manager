## The goal of this project is to code with LLM. 
 - the devcontainer setup was manual.
 - the readme updates are manual.

Progress:
![After adding backend API](progress.png)

## Prompts used
1. Rewrite this app in typescript
2. update the frontend application to implement a bookmark manager for web urls. I want the ability to list bookmarks and mark them as read. For the frontend app, create a new mock api to return the bookmarks. The bookmark has a url, a title, create_date, read_date.
    a. {One compiler error. copy pasted and resolved.}
3. now implement the api logic in the backend app and wire it up with the frontend app. For now, the backend app should use a mock api layer. the frontend app should have an option to use its mock api or to use the backend api.
    a. can you instead use the proxy setting on the frontend app to solve the cors issue?


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
