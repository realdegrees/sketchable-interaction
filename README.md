A live version of this application is hosted on [si.realdegrees.dev](https://si.realdegrees.dev/).
Alternatively the provided [Dockerfile](Dockerfile) can be used.

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
- Due to an issue with indicator arrows not being cleaned up after being disconnected this feature was disabled on the final version
(It is still available to use in the framework but disabled in for the sample plugins)