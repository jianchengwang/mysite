# API Project

## Project Structure
```
api/
├── apps/
│   ├── english_chunk/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── service.py
│   └── live2d/
│       ├── __init__.py
│       ├── models.py
│       ├── routes.py
│       └── service.py
├── config/
│   ├── __init__.py
│   └── settings.py
├── main.py
├── requirements.txt
└── README.md
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Google API Key

## Setup

1. Create and activate a virtual environment:
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
GOOGLE_API_KEY=your_google_api_key
```

4. Run the development server:
```bash
uvicorn main:app --reload
```

The server will start at `http://localhost:8000`

## Development

### Project Architecture

- `apps/`: Contains all application modules
  - `english_chunk/`: English learning chunk generation module
  - `live2d/`: Live2D character interaction module
- `config/`: Configuration management
- `main.py`: Application entry point

### Key Components

- **Models**: Define data structures and validation
- **Routes**: Handle HTTP endpoints and request/response
- **Services**: Implement business logic and external API integration
- **Config**: Manage environment variables and settings

### Dependencies

- FastAPI: Web framework
- Google Generative AI: AI model integration
- Uvicorn: ASGI server
- Python 3.8+: Runtime environment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 