# Link Checker

Very fast link-checking based on [linkcheck](https://github.com/filiph/linkcheck).  
Provides a tiny CLI to download the [linkcheck](https://github.com/filiph/linkcheck) binary, start a local HTTP server and check links.

## Install

Install from GitHub:

    $ npm i neo4j-documentation/link-checker#v0.1.0

## Usage

    $ link-checker build/site

Using `npx`:

    $ npx link-checker build/site

## Options

| Option | Description |
|---|---|
| `-r, --redirect <from=to>` | a redirection from source to destination directory |
| `--static <route=staticRootDir>` | a route that serves static assets (from a directory) |
| `--skip-file`| a file that contains a list of URLs to skip (one regular expression per line) |

## Notes

- Use the [find-cache-dir](https://www.npmjs.com/package/find-cache-dir) package to locate the cache directory
- Donwload `linkcheck` from GitHub into the cache directory (_./node_modules/.cache/link-checker_)
- Use the [portfinder](https://www.npmjs.com/package/portfinder) package to find an available port (by default 8000)
- Start a local HTTP server to serve the local directory
- Use `linkcheck` to check links
- Stop the local HTTP server
- Print report to the stderr/stdout
