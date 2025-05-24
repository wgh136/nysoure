# Nysoure

A file sharing service that allows you to upload files and share them with others.

## Features

- **Resource Creation**: Create resources with a title, description, tags, and images.
- **File Uploads**: Attach files to resources for easy sharing.
- **Comments**: Comment on resources to foster discussions or provide feedback.
- **File Downloads**: Download shared files with ease.
- **Search Functionality**: Quickly find resources by title, description, or tags.
- **Admin Management**: Full server control via an intuitive management panel.
- **Abuse Prevention**: Integrated with Cloudflare Turnstile and IP-based download limits to prevent misuse.

## Deployment

### Docker

1. Clone the repository
2. Install Docker and Docker Compose
3. Run `docker-compose up -d` to start the application

### Python script

1. Clone the repository
2. Install Python, golang, nodejs, and npm
3. Run `python3 build.py` to build the application
4. Set up the database and environment variables
5. Execute the binary file in the `build` folder

Environment variables:
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME