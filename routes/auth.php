<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Firebase Authentication Routes
// All authentication is handled in the frontend with Firebase
Route::middleware('guest')->group(function () {
    Route::get('register', function() {
        return Inertia::render('Auth/Register');
    })->name('register');

    Route::get('login', function() {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => false,
            'status' => session('status'),
        ]);
    })->name('login');

    Route::get('forgot-password', function() {
        return Inertia::render('Auth/ForgotPassword');
    })->name('password.request');

    Route::get('reset-password/{token}', function() {
        return Inertia::render('Auth/ResetPassword');
    })->name('password.reset');
});
