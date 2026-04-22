import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter new app version (e.g., 0.4.1): ', (version) => {
  if (!version || version.trim() === '') {
    console.error('Error: Version cannot be empty.');
    rl.close();
    process.exit(1);
  }

  const v = version.trim();
  console.log(`\nUpdating package.json to version ${v}...`);
  
  try {
    // Update version in package.json without creating a git tag or commit
    execSync(`npm version ${v} --no-git-tag-version`, { stdio: 'inherit' });
    
    console.log('\nBuilding the project...');
    execSync('npm run build', { stdio: 'inherit' });

    console.log('\n============================================');
    console.log(`✅ Version updated to ${v} and build complete!`);
    console.log('============================================');
    console.log('To publish the new version to npm, run the following commands:\n');
    console.log('  npm login');
    console.log('  npm publish\n');
  } catch (err) {
    console.error('\n❌ An error occurred during the process:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
});
