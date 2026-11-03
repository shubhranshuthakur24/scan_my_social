<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Automate Instagram comment-to-DM workflows with Scan My Social AutoDM: reply publicly, send private follow-ups, qualify leads, and convert conversations at scale.">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    <meta property="og:site_name" content="Scan My Social">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Scan My Social">
    <meta property="og:description" content="Automate Instagram comment-to-DM workflows with Scan My Social AutoDM: reply publicly, send private follow-ups, qualify leads, and convert conversations at scale.">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:image" content="{{ asset('images/og-default.png') }}">
    <meta property="og:image:secure_url" content="{{ asset('images/og-default.png') }}">
    <meta property="og:image:alt" content="Scan My Social preview image">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Scan My Social">
    <meta name="twitter:description" content="Automate Instagram comment-to-DM workflows with Scan My Social AutoDM: reply publicly, send private follow-ups, qualify leads, and convert conversations at scale.">
    <meta name="twitter:image" content="{{ asset('images/og-default.png') }}">

    <!-- Fonts   Zain (brand), Clash Display (premium headings), Sora, DM Sans -->
    <link rel="preload" href="/fonts/zain-font-family/Zain-Black-BF66ac52d77ca46.ttf" as="font" type="font/ttf"
        crossorigin>

    <link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Pacifico&family=Sora:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600&family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
        rel="stylesheet" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />

    <!-- Scripts -->
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @if(auth()->check())
        @routes
    @else
        @routes(['public', 'app', 'admin'])
    @endif
    @viteReactRefresh
    @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    @inertiaHead
</head>

<body class="antialiased">
    @inertia
</body>

</html>
