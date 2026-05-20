# Security Policy

## Supported Versions

LiteCursor is currently in early development. Security updates will be applied to the latest version only.

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please open a GitHub issue or contact the maintainer directly.

Please include:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Suggested fix, if available

## Security Notes

LiteCursor can read files, write files, and run terminal commands inside your project directory.

Use it carefully.

Recommended safety practices:

- Do not run LiteCursor in sensitive or production directories.
- Do not expose your `.env` files or API keys.
- Review file changes before committing.
- Be careful when allowing terminal commands.
- Use a dedicated test project when trying new models or skills.

## Scope

Security issues may include:

- Accessing files outside the configured project path
- Unsafe command execution
- Leaking environment variables or secrets
- Unexpected file modification
- Prompt injection that causes unsafe tool usage

## Disclaimer

LiteCursor is provided as-is. You are responsible for reviewing actions performed by the assistant before using the results in production.
