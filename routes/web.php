<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Define route group for authenticated pages
Route::middleware(['web'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Admin Routes - No additional middleware since Firebase handles auth
    Route::prefix('admin')->group(function () {
        Route::get('/users', function () {
            return Inertia::render('Admin/UserManagement');
        })->name('admin.users');

        // Item Management Routes
        Route::prefix('items')->group(function () {
            Route::get('/', function () {
                return Inertia::render('Admin/Items/ItemManage');
            })->name('admin.items.index');

            Route::get('/list', function () {
                return Inertia::render('Admin/Items/ItemList');
            })->name('admin.items.list');

            Route::get('/status', function () {
                return Inertia::render('Admin/Items/ItemStatus');
            })->name('admin.items.status');

            Route::get('/create', function () {
                return Inertia::render('Admin/Items/ItemCreate');
            })->name('admin.items.create');

            Route::get('/import', function () {
                return Inertia::render('Admin/Items/ItemImport');
            })->name('admin.items.import');

            Route::get('/export', function () {
                return Inertia::render('Admin/Items/ItemExport');
            })->name('admin.items.export');

            Route::get('/{id}/edit', function ($id) {
                return Inertia::render('Admin/Items/ItemEdit', ['itemId' => $id]);
            })->name('admin.items.edit');
        });

        // Temporary route for adding sample data
        Route::get('/admin/sample-data', function () {
            return Inertia::render('Admin/Items/SampleData');
        })->name('admin.sample-data');
    });
});

require __DIR__.'/auth.php';
