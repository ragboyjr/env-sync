function ParsedFile(lines, vars) {
    this.lines = lines;
    this.vars = vars;
}

ParsedFile.prototype.compileVars = function compileVars() {
    Object.keys(this.vars).forEach(key => {
        const fv = this.vars[key];
        this.lines[fv.lineNo] = fv.name + '=' + fv.val;
    });
}
ParsedFile.prototype.toEnvFile = function toEnvFile() {
    return this.lines.join("\n");
}

exports.ParsedFile = ParsedFile;
