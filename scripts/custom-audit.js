const { exec } = require('child_process');

exec('yarn audit', (error, stdout, stderr) => {
  console.log(stdout); // Display audit output for clarity
  console.error(stderr); // Display any error logs

  if (error) {
    console.error(`Command failed with exit code: ${error.code}`);
    // Allow exit codes 16 (critical vulnerabilities)
    if (error.code === 16) {
      console.log('Only critical vulnerabilities found. Exiting with code 1.');
      process.exit(1);
    } else {
      console.error('Non-critical vulnerabilities found. Exiting with code 0.');
      process.exit(0);
    }
  } else {
    console.log('No vulnerabilities found. Exiting with code 0.');
    process.exit(0);
  }
});
