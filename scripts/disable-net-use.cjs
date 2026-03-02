const childProcess = require("node:child_process");

const originalExec = childProcess.exec;

function createNoopChild() {
    return {
        pid: 0,
        kill() {
            return true;
        },
        on() {
            return this;
        },
        once() {
            return this;
        },
        stdout: null,
        stderr: null,
    };
}

childProcess.exec = function patchedExec(command, ...args) {
    if (
        typeof command === "string" &&
        command.trim().toLowerCase() === "net use"
    ) {
        const callback = args[args.length - 1];
        if (typeof callback === "function") {
            process.nextTick(() => callback(null, "", ""));
        }
        return createNoopChild();
    }

    return originalExec.call(this, command, ...args);
};
