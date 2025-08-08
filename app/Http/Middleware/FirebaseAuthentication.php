<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FirebaseAuthentication
{
    public function handle(Request $request, Closure $next)
    {
        // Add Firebase auth state to all Inertia responses
        Inertia::share('auth', [
            'isInitialized' => true,
        ]);

        return $next($request);
    }
}
