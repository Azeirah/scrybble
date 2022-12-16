# Scrybble

## Development on a new machine

```shell
npm i
# go to your obsidian folder
# cd ~/Lauranomicon/.obsidian
mkdir -p plugins
cd plugins
# symlink this project to the plugins folder
ln -s 
```

## Development

`npm run dev`

You need to restart Obsidian whenever you make a change

## Release

Run `npm version patch`, `npm version minor` or `npm version major` after updating `minAppVersion` manually
in `manifest.json`.
