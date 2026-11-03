<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Redirecting | ScanMySocial</title>
    <meta name="robots" content="noindex, nofollow, noarchive">
    <style>
        :root {
            --bg: #f7f8fb;
            --text: #1f2a44;
            --muted: #6c7488;
            --brand: #5b2be0;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: var(--bg);
            color: var(--text);
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        .card {
            text-align: center;
            padding: 2rem 1.5rem;
            max-width: 420px;
            width: 100%;
        }
        .logo {
            width: 44px;
            height: 44px;
            margin: 0 auto 1rem;
            border-radius: 12px;
            background: var(--brand);
            display: grid;
            place-items: center;
            color: #fff;
            font-weight: 800;
            letter-spacing: 0.5px;
        }
        h1 {
            margin: 0;
            font-size: 2rem;
            line-height: 1.1;
            font-weight: 800;
        }
        p {
            margin: 0.75rem 0 0;
            color: var(--muted);
            font-size: 1rem;
        }
        .spinner {
            margin: 1.5rem auto 0;
            width: 30px;
            height: 30px;
            border-radius: 9999px;
            border: 3px solid #d9def0;
            border-top-color: var(--brand);
            animation: spin .8s linear infinite;
        }
        .link {
            margin-top: 1.25rem;
            display: inline-block;
            color: var(--brand);
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <noscript>
        <meta http-equiv="refresh" content="1;url={{ $targetUrl }}">
    </noscript>

    <main class="card">
        <div class="logo">S</div>
        <h1>Redirecting</h1>
        <p>This conversation is automated by ScanMySocial.</p>
        <div class="spinner" aria-hidden="true"></div>
        <a class="link" href="{{ $targetUrl }}" rel="noopener noreferrer">Continue</a>
    </main>

    <script>
        setTimeout(function () {
            window.location.replace(@json($targetUrl));
        }, 900);
    </script>
</body>
</html>
