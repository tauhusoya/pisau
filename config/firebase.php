<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Firebase Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your Firebase settings for the application.
    |
    */

    'project_id' => env('FIREBASE_PROJECT_ID', 'knives-laravel'),
    'database_url' => env('FIREBASE_DATABASE_URL', 'https://knives-laravel-default-rtdb.firebaseio.com'),
    'credentials_path' => env('FIREBASE_CREDENTIALS_PATH', storage_path('firebase-credentials.json')),
    
    /*
    |--------------------------------------------------------------------------
    | Firebase Auth Settings
    |--------------------------------------------------------------------------
    |
    | Configure Firebase Authentication settings.
    |
    */
    
    'auth' => [
        'enabled' => env('FIREBASE_AUTH_ENABLED', true),
        'token_expiry' => env('FIREBASE_TOKEN_EXPIRY', 3600), // 1 hour
    ],
    
    /*
    |--------------------------------------------------------------------------
    | Firebase Firestore Settings
    |--------------------------------------------------------------------------
    |
    | Configure Firebase Firestore settings.
    |
    */
    
    'firestore' => [
        'enabled' => env('FIREBASE_FIRESTORE_ENABLED', true),
        'collection_prefix' => env('FIREBASE_FIRESTORE_COLLECTION_PREFIX', ''),
    ],
];
