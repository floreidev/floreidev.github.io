const createElement = (el, inner, attr = [], p = null, ...children) => {
    var x = document.createElement(el);
    x.innerHTML = inner;
    for (var c of children) {
        x.appendChild(c)
    }
    for (var a of attr) {
        x.setAttribute(a.split("=")[0], a.split("=")[1])
    }
    if (p) p.appendChild(x);
    return x;
}

const dosModeClick = (ev) => document.getElementById("dosIn").focus();


class WTFS {
    constructor(save = null) {
        this.fs = save || {};
    }

    dir(dir) {
        dir = this.navigate(dir);
        var x = this.fs;
        var y = dir.split("/");
        for (var z of y) {
            if (!x[z]) return -1;
            x = x[z];
        }
        return x;
    }

    navigate(dir, part = false) {
        var y = part ? `${dir}/${part}`.split("/") : dir.split("/");
        var dirStack = []
        for (var z of y) {
            if (z === "..") dirStack.pop();
            else dirStack.push(z);
        }
        return dirStack.join("/");
    }

    extractLast(dir, part = false) {
        var y = part ? `${dir}/${part}`.split("/") : dir.split("/");
        var dirStack = []
        for (var z of y) {
            if (z === "..") dirStack.pop();
            else dirStack.push(z);
        }
        return dirStack[dirStack.length - 1];
    }

    write(file, content, mode = 'w', quit = false) {
        file = this.navigate(file);
        const d = this.dir(file)["$"];
        if (!d || d == -1) {
            if (this.createFile(file) == -1) return -1;
            else return this.write(file, content, mode, quit);
        }
        if (d.TYPE === "folder") return -1;
        else {
            switch (mode) {
                default:
                case "w":
                    d.CONTENT = `${content}`;
                    break;
                case "a":
                    d.CONTENT = `${d.CONTENT}${content}`
                    break;
            }
        }
        return 0;
    }

    createFile(file) {
        var dir = this.navigate(file);
        var x = this.fs;
        var y = dir.split("/");
        var mkfile = y.pop();
        for (var z of y) {
            if (!x[z]) return -1;
            x = x[z];
        }
        if (x["$"].TYPE != "folder") return -1;
        x[mkfile] = { "$": { "TYPE": "file", "CONTENT": "" } }
        return x;
    }

    mkdir(dir) {
        var d = this.navigate(dir, "..");
        console.log(d, dir)
        var x = this.fs;
        var y = d.split("/");
        for (var z of y) {
            console.log(x, y, z)
            if (!x[z]) return -1;
            x = x[z];
        }
        if (x["$"].TYPE != "folder") return -1;
        x[dir.split("/")[dir.split("/").length - 1]] = { "$": { "TYPE": "folder" } }
        return x;
    }

}

class Root {
    constructor(el, initFileTree) {
        this.el = el
        this.el.addEventListener("keydown", (ev) => this.keyDown(ev));
        this.input().focus()
        this.fs = new WTFS(JSON.parse(window.localStorage.getItem("fs") || JSON.stringify(initFileTree)));
        this.openedDir = "C:/Local/site";
        this.commands = {
            "__": {
                exec: (parmas) => {
                    return JSON.stringify(this.fs.fs)
                }
            },
            "help": {
                help: "Displays a list of commands",
                exec: (params) => Object.entries(this.commands).filter(([k, v]) =>k != "__").map(([k, v]) => `${k}:${new Array(12 - k.length).fill(" ").join("")}${v.help}`).join("\n")
            },
            "ls": {
                help: "Displays a list of all subdirectories and files in the current directory.",
                exec: (params) => `==== Subdirectories and Files ====\n${this.ls().join(`    `)}`
            },
            "cat": {
                help: "Displays the contents of a file.",
                exec: (params) => {
                    if(!params || params.length < 1) return "Please specify a file to view." ;
                    var d = this.fs.dir(this.fs.navigate(this.openedDir, params.join(" ")));
                    if(d && d["$"] && d["$"].TYPE == "file") return d["$"].CONTENT
                    return `File '${params.join(" ")}' not found. Type 'ls' for a list of files, or 'touch ${params.join(" ")}' to create a file.`
                }
            },
            "nano": {
                help: "Sets a file's contents (nano <file>|<contents>)",
                exec: (params) => {
                    var [file, file0, contents] = params.join(" ").split(/([^\\])\|/g);
                    var fileName = `${file}${file0}`;
                    var file = this.isRelative(fileName) ? this.fs.dir(this.fs.navigate(this.openedDir, fileName)) : this.fs.dir(fileName);
                    if(file && file["$"] && file["$"].TYPE === "file") file["$"].CONTENT = contents.replace(/\\\|/g, "|");
                    else return "File not found."
                    return "File editted succesfully."
                }
            },
            "ver": {
                help: "Displays the system version.",
                exec: (params) => `Version FS-WOS 1.0.0\n==== UPDATE AVAILABLE ====\nType 'update' to update your operating system.`
            },
            "echo": {
                help: "Displays the inputted text",
                exec: (params) => `${params.join(" ")}`
            },
            "cd": {
                help: "Change directory to the specified parameter.",
                exec: (params) => {
                    var previousDir = this.openedDir;
                    console.log(this.isRelative(params.join(" ")))
                    if (this.isRelative(params.join(" ")))
                        this.openedDir = this.fs.navigate(this.openedDir, params.join(" "));
                    else
                        this.openedDir = this.fs.navigate(params.join(" "));

                    var d = this.fs.dir(this.openedDir);
                    console.log(d);
                    if (!d || d == -1 || d["$"].TYPE != "folder") {
                        this.openedDir = previousDir;
                        return `Directory not found.`
                    }
                    return this.openedDir;
                }
            },
            "mkdir": {
                help: "Create a new directory",
                exec: (params) => {
                    if(params.join(" ").startsWith("$") || this.fs.extractLast(params.join(" ")).indexOf(":") != -1) return `Directory name must not start with $ and must not contain :`;
                    return (this.isRelative(params.join(" ")) ? this.fs.mkdir(this.openedDir + "/" + params.join(" ")) : this.fs.mkdir(params.join(" "))) == -1 ? "Could not create directory." : "Directory created succesfully.";
                }
            },
            "touch": {
                help: "Creates a new file",
                exec: (params) => {
                    if(params.join(" ").startsWith("$") || this.fs.extractLast(params.join(" ")).indexOf(":") != -1) return `File name must not start with $ and must not contain :`;
                    return (this.isRelative(params.join(" ")) ? this.fs.createFile(this.openedDir + "/" + params.join(" ")) : this.fs.createFile(params.join(" "))) == -1 ? "Could not create file." : "File created succesfully.";                    
                }
            },
            "exec": {
                help: "Executes a script file",
                exec: async (params) => {
                    if(!params || params.length < 1) return "Please specify a file to execute." ;
                    var d = this.fs.dir(this.fs.navigate(this.openedDir, params.join(" ")));
                    if(!d && d["$"] && d["$"].TYPE == "file") return `File '${params.join(" ")}' not found. Type 'ls' for a list of files, or 'touch ${params.join(" ")}' to create a file.`
                    var script = d["$"].CONTENT;
                    var commands = script.split(";");
                    const rf = (i) => {
                        return new Promise(async (resolve, reject) => {
                            if(i >= commands.length) return resolve(i);
                            var pras = commands[i].split(" ");
                            var cmd = pras.shift();
                            this.executeCommand(cmd, pras).then(async (v) => resolve(await rf(i + 1)))
                        })

                    }
                    await rf(0)
                    console.log("await fin")
                    return "Execution Successful."
                }
            }
        }
        document.addEventListener("click", dosModeClick)
    }

    isRelative(p) {
        return !p.startsWith("/") && p.indexOf(":") == -1
    }

    ls() {
        return Object.keys(this.fs.dir(this.openedDir)).filter((v) => v != "$");
    }

    executeCommand(cmd, params = []) {
        return new Promise(async (resolve, reject) => {
            if (this.commands[cmd]) {
                var x = await this.commands[cmd].exec(params);
                this.typewrite(`\n${x}\n`, 1);
                setTimeout(() => resolve(cmd), (x.length + 3))
            }
            else {
                var x = `\nCommand '${cmd}' not found. Type 'help' for a list of commands.\n\n`
                this.typewrite(x, 7);
                setTimeout(() => resolve(cmd), x.length)
            }
        })
    }

    typewrite(v, time) {
        const p = createElement("p", "", [], this.el);
        const w = (i) => setTimeout(() => { p.innerHTML += v.substring(i, i + 1).replace("\n", "<br>").replace("	", '&emsp;'); this.el.scrollTo(0, this.el.scrollHeight); }, i * time);
        for (var i = 0; i < v.length; i++) {
            w(i);
        }
    }

    input(n = false) {
        if (n) {
            this.inputEl = n;
            return n;
        }
        if (this.inputEl) return this.inputEl;
        this.inputEl = document.getElementById("dosIn");
        return this.inputEl;
    }

    latest(n = false) {
        if (n) {
            this.latestEl = n;
            return n;
        }
        if (this.latestEl) return this.latestEl;
        this.latestEl = document.getElementById("dosLatest");
        return this.latestEl;
    }

    keyDown(ev) {
        if (ev.key == "Enter") {
            var c = this.latest().textContent;
            var v = this.input().textContent;
            this.latest().remove();
            this.el.appendChild(createElement("p", c));
            var params = v.split(" ");
            var cmd = params.shift();
            this.executeCommand(cmd, params).then((vvv) => {
                this.latest(
                    createElement("div", "", ['id=dosLatest'], this.el,
                        createElement("p", this.openedDir + ">", []),
                        this.input(createElement("p", "", ['contenteditable=true', 'id=dosIn']))
                    )
                )
                this.input().focus();
            }).catch((vv) => console.log("Command not found.", vv))
        } else if (ev.key == "ArrowLeft") {
            var selection = window.getSelection();;
            var realLeft = Math.max(selection.anchorOffset + 1, 0);
            var offset = 0.53* (selection.focusNode.textContent.length - realLeft) + 0.53

            this.input().style.setProperty("--offset", `${offset}em`);
        } else if (ev.key == "ArrowRight") {
            var selection = window.getSelection();;
            var realLeft = Math.min(selection.anchorOffset + 2, selection.focusNode.textContent.length + 2);
            var offset = 0.53* (selection.focusNode.textContent.length - realLeft) + 0.53

            this.input().style.setProperty("--offset", `${offset}em`);

        }
    }
}

const INTIAL_FILE_SYSTEM = {
    "C:": {
        "$": { "TYPE": "folder" },
        "Local": {
            "$": { "TYPE": "folder" },
            "site": {
                "$": { "TYPE": "folder" },
                "about.txt": { "$": { "TYPE": "file", "CONTENT": "yap" } },
                "projects.txt": { "$": { "TYPE": "file", "CONTENT": "yap" } },
                "socials.txt": { "$": { "TYPE": "file", "CONTENT": "yap" } }
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const root = new Root(document.getElementById("dosOut"), INTIAL_FILE_SYSTEM)
})