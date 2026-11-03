<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class FixStorageLinkCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:fix-storage-link {public_path? : Custom public path, e.g., public_html}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fixes the storage symlink for non-standard public paths (e.g. public_html on Hostinger)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $customPublic = $this->argument('public_path');

        // Determine the target public directory
        $publicPath = null;
        if ($customPublic) {
            // Check if it's an absolute path
            if (File::exists($customPublic) && File::isDirectory($customPublic)) {
                $publicPath = $customPublic;
            }
            // Check relative to base path
            elseif (File::exists(base_path($customPublic)) && File::isDirectory(base_path($customPublic))) {
                $publicPath = base_path($customPublic);
            }
            // Check relative to parent of base path (common on shared hosting where app/ is next to public_html/)
            elseif (File::exists(dirname(base_path($customPublic))) && File::isDirectory(dirname(base_path($customPublic)))) {
                // Optimization: if base_path ends with /Scan My Social and they passed public_html,
                // we might be looking for ../public_html
                $parentPath = dirname(base_path()).DIRECTORY_SEPARATOR.$customPublic;
                if (File::exists($parentPath) && File::isDirectory($parentPath)) {
                    $publicPath = $parentPath;
                }
            }
        }

        if (! $publicPath) {
            $publicPath = public_path();
        }

        $linkPath = $publicPath.DIRECTORY_SEPARATOR.'storage';
        $targetPath = storage_path('app/public');

        $this->info('Checking storage link...');
        $this->line("Public Path: {$publicPath}");
        $this->line("Link Path:   {$linkPath}");
        $this->line("Target Path: {$targetPath}");

        if (! File::exists($publicPath)) {
            $this->error("Target public directory [{$publicPath}] does not exist.");
            $this->line('Available directories in '.dirname(base_path()).':');
            $dirs = array_filter(glob(dirname(base_path()).'/*'), 'is_dir');
            foreach ($dirs as $dir) {
                $this->line(' - '.basename($dir));
            }

            return 1;
        }

        // Check if it already exists
        if (file_exists($linkPath)) {
            if (is_link($linkPath)) {
                $this->warn('Link already exists. Removing old link...');
                if (! @unlink($linkPath)) {
                    $this->error('Failed to remove old link. Check permissions.');

                    return 1;
                }
            } else {
                $this->warn("A directory already exists at [{$linkPath}]. Moving it to backup...");
                $backupPath = $linkPath.'_backup_'.time();
                if (! @rename($linkPath, $backupPath)) {
                    $this->error('Failed to rename existing directory. Check permissions.');

                    return 1;
                }
                $this->info("Moved existing directory to [{$backupPath}]");
            }
        }

        // Create the symlink
        try {
            if (PHP_OS_FAMILY === 'Windows') {
                $this->warn('Creating symlink on Windows...');
                if (function_exists('exec')) {
                    exec("mklink /D \"{$linkPath}\" \"{$targetPath}\"");
                } else {
                    $this->error("'exec' is disabled. Use 'mklink /D' in an Admin Command Prompt manually.");
                }
            } else {
                if (function_exists('symlink')) {
                    if (@symlink($targetPath, $linkPath)) {
                        $this->info("Successfully linked [{$linkPath}] to [{$targetPath}]");
                    } else {
                        $this->error('Failed to create symlink via PHP. Check permissions.');
                        $this->line('Try running this manual command via SSH:');
                        $this->info("ln -s {$targetPath} {$linkPath}");

                        return 1;
                    }
                } else {
                    $this->error("The 'symlink' function is disabled on your server (Shared Hosting restriction).");
                    $this->line('Please run this command manually via SSH:');
                    $this->info("ln -s {$targetPath} {$linkPath}");
                    $this->line('Alternatively, create a cron job with that command if SSH is not available.');

                    return 1;
                }
            }

            // Re-verify
            if (file_exists($linkPath)) {
                $this->info('✅ Storage link verified!');
            } else {
                $this->error('❌ Verification failed. The link was not created.');

                return 1;
            }

        } catch (\Exception $e) {
            $this->error('An error occurred: '.$e->getMessage());

            return 1;
        }

        return 0;
    }
}
