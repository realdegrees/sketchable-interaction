A live version of this application is hosted on [si.realdegrees.dev](https://si.realdegrees.dev/).
Alternatively the provided [Dockerfile](Dockerfile) can be used (Fair warning due to an unresolved issue with the importing of icons the size of the docker image is around 3gb)

## Description 
This a web-based implementation of [Sketchable Interaction](https://hci.ur.de/projects/sketchable_interaction) developed as part of a bachelor thesis "Implementation and Evaluation of a web-based Sketchable Interaction framework for file management".

## Development
To develop using the Sketchable Interaction framework
- Clone the repository
- Run `pnpm install`
- Clone the `plugins/_template` folder
- Adjust the config and classname to your plugin name
- Develop a plugin using the guidelines in the template
- Run `pnpm run dev`

## Building
This project can be built with the provided docker image or by running `pnpm run build`

## Known Issues
- Avoid introducing large video files to the canvas as the loading can quickly stall the app
- The application slows down significantly when around 30 or more file shapes are present on a canvas due to an issue with rerender of the parent folder to avoid this you can build smaller workflows where files are processed quickly and don't live on the canvas for long.