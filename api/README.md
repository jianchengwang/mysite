# English Chunk Generator API

This API generates common English chunks with example sentences using Google's Gemini AI model.

## Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

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
- Copy `.env.example` to `.env`
- Add your Google API key to the `.env` file

4. Run the server:
```bash
uvicorn english_chunk.generate:app --reload
```

## API Endpoints

### POST /api/english-chunk/generate

Generate English chunks based on topic and number of chunks requested.

Request body:
```json
{
    "num_chunks": 5,
    "topic": "daily_routines"
}
```

Response:
```json
{
    "chunks": [
        {
            "phrase": "wake up",
            "examples": [
                "I usually wake up at 7 AM every morning.",
                "She woke up late and missed her train."
            ]
        }
        // ... more chunks
    ]
}
```

Available topics:
- daily_routines
- work_life
- socializing
- hobbies
- travel

## Development

### Project Structure
```
api/
├── english_chunk/
│   └── generate.py
├── venv/
├── .env
├── .gitignore
├── requirements.txt
└── README.md
```

### Running Tests
```bash
# Make sure you're in the virtual environment
pytest
```

### Deactivating Virtual Environment
```bash
deactivate
``` 