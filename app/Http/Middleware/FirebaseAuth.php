<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Auth;

class FirebaseAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'No token provided'], 401);
        }

        try {
            // Initialize Firebase Admin SDK
            $factory = (new Factory)
                ->withServiceAccount(storage_path('firebase-credentials.json'))
                ->withDatabaseUri(config('firebase.database_url'));

            $auth = $factory->createAuth();
            
            // Verify the Firebase token
            $verifiedIdToken = $auth->verifyIdToken($token);
            $uid = $verifiedIdToken->claims()->get('sub');
            
            // Add user data to request
            $request->merge(['user' => [
                'uid' => $uid,
                'email' => $verifiedIdToken->claims()->get('email'),
                'name' => $verifiedIdToken->claims()->get('name'),
            ]]);
            
            return $next($request);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid token'], 401);
        }
    }
}
