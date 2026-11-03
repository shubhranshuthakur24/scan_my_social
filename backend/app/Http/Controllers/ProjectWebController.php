<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class ProjectWebController extends Controller
{
    public function index()
    {
        return Inertia::render('Projects/Index');
    }

    public function show($id)
    {
        return Inertia::render('Projects/Show', [
            'id' => $id,
        ]);
    }
}
