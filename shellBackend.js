const { spawn } = require('child_process');

// Replace 'bash' with the shell you want to use (e.g., 'sh', 'zsh', 'powershell')
const shell = 'bash';

// Start a new shell instance
const childProcess = spawn(shell);

// Listen to the 'data' event on stdout to get the output of the executed commands
childProcess.stdout.on('data', (data) => {
    // console.log(`shell stdout::\n${data}`);
});

// Listen to the 'data' event on stderr to get the error messages (if any)
childProcess.stderr.on('data', (data) => {
    console.error(`shell stderr::\n${data}`);
});

// Listen to the 'exit' event to know when the child process has exited
childProcess.on('exit', (code) => {
    console.log(`shell child process exit with ${code}`);
});

function execOnce(cmd, rev_data = undefined, showLog=false) {
    if (rev_data) {
        childProcess.stdout.once('data', rev_data);
    }

    if(showLog)
    {
        childProcess.stdout.once('data', (data) => {
            console.log(`exec ${cmd} => ${data}`);
        });
    }
    
    childProcess.stdin.write(`${cmd}\n`);
}

function exitShell()
{
    // Close the stdin stream to let the shell instance know there are no more commands to execute
    childProcess.stdin.end();
}


module.exports = {
    execOnce,
}
