#!/usr/bin/env python3
"""Non-mutating deployment verification; never print configuration values."""
import argparse
import json
from pathlib import Path
import urllib.request
import urllib.error
import urllib.parse

parser = argparse.ArgumentParser()
parser.add_argument('base')
parser.add_argument('config')
parser.add_argument('--tts', action='store_true', help='Verify new TTS routes without real generation')
args = parser.parse_args()
config = dict(line.split('=', 1) for line in Path(args.config).read_text().splitlines()
              if '=' in line and not line.lstrip().startswith('#'))
auth = {'Authorization': 'Bearer ' + config['BACKEND_ACCESS_KEY']}
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def request(path, status, headers=None, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(args.base + path, headers=headers or {}, data=data)
    try:
        with opener.open(req, timeout=8) as response:
            code, body = response.status, response.read()
    except urllib.error.HTTPError as error:
        code, body = error.code, error.read()
    if code != status:
        raise SystemExit(f'HTTP verification failed for {path}: expected {status}, got {code}')
    return body

for path in ['/', '/tech/', '/column/', '/links/', '/about/', '/health/live', '/health/ready']:
    body = request(path, 200)
    if not path.startswith('/health/'):
        for prefix in ['/english', '/tools', '/games']:
            if f'href="{prefix}' in body.decode():
                raise SystemExit(f'Removed navigation found in {path}')
for path in ['/english', '/english/', '/english/ngsl', '/tools', '/tools/', '/tools/md-to-wechat',
             '/tools/storyboard', '/games', '/games/', '/games/chinese-chess',
             '/engines/xiangqi-opening-book.json', '/qwerty/dicts/index.json', '/live2d/sdk/live2dv3.js']:
    request(path, 404)
for path in [f'/store/{slug}{suffix}' for slug in ['wenroudao', 'changanluan', 'mingyuelei'] for suffix in ['', '/']]:
    request(path, 404)

# Check the approved complete collections so future builds cannot drop them.
for path, count in [('/column/llm-to-agent-learning/', '36篇可读'), ('/store/wenroudao-long/', '60章可读')]:
    body = request(path, 200).decode()
    if count not in body:
        raise SystemExit(f'Approved collection incomplete: {path}')
request('/store/', 200)
for root, count in [('/column/llm-to-agent-learning', 36), ('/store/wenroudao-long', 60)]:
    for chapter in range(1, count + 1):
        path = f'{root}/{chapter:02d}/'
        body = request(path, 200).decode()
        if root.startswith('/store/') and ('novel-paragraph' not in body or '阅读设置' not in body):
            raise SystemExit(f'Novel reading layout missing: {path}')

request('/api/blog/content', 401)
request('/api/blog/content', 401, {'Authorization': 'Bearer invalid-verification-key'})
request('/api/blog/content?key=dummy-verification-key', 401)
request('/api/blog/content', 200, {**auth, 'Origin': 'http://127.0.0.1:9001'})
rows = json.loads(request('/api/blog/content', 200, auth))
retired = {'store/wenroudao.md', 'store/changanluan.md', 'store/mingyuelei.md'}
if any(row['path'] in retired for row in rows):
    raise SystemExit('Retired Store content remains in the API index')
for path in sorted(retired):
    request('/api/blog/content/' + urllib.parse.quote(path, safe='/'), 404, auth)
if not rows:
    raise SystemExit('Database content read unexpectedly empty')
request('/api/blog/content/' + urllib.parse.quote(rows[0]['path'], safe='/'), 200, auth)
print(f'Static pages, removed routes, health and authentication passed; DB content rows={len(rows)}')

if args.tts:
    tts_headers = {**auth, 'Content-Type': 'application/json'}
    request('/api/tts/capabilities', 401)
    request('/api/tts/capabilities', 401, {'Authorization': 'Bearer invalid-verification-key'})
    request('/api/tts', 401, {'Content-Type': 'application/json'}, {'text': 'deployment check'})
    capabilities = json.loads(request('/api/tts/capabilities', 200, auth))
    if capabilities.get('provider') != 'mimo' or capabilities.get('formats') != ['wav']:
        raise SystemExit('TTS capabilities do not match this release')
    # Invalid parameters are rejected before any provider call, even when configured.
    request('/api/tts', 400, tts_headers, {'text': 'deployment check', 'voice': 'invalid'})
    request('/api/tts', 400, tts_headers, {'text': 'deployment check', 'base_url': 'https://invalid.example'})
    if capabilities.get('configured') is False:
        body = json.loads(request('/api/tts', 503, tts_headers, {'text': 'deployment check'}))
        if body.get('detail') != 'TTS is not configured on the server':
            raise SystemExit('TTS missing-credential response does not match this release')
        print('TTS routes/auth/validation passed; configured=false; missing-key 503 verified; no real generation')
    elif capabilities.get('configured') is True:
        print('TTS routes/auth/validation passed; configured=true; credentials unverified; no generation requested')
    else:
        raise SystemExit('TTS configuration state is invalid')
