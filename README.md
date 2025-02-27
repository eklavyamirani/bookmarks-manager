## The goal of this project is to code with LLM. 
 - the devcontainer setup was manual.
 - the readme updates are manual.

Progress:
<img width="1073" alt="IMG_9984" src="https://github.com/user-attachments/assets/a10e2ee3-98b5-4cf7-ac77-972de299918a" />


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
