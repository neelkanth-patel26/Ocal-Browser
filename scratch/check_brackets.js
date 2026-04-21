
const fs = require('fs');
const content = fs.readFileSync('main.js', 'utf8');

let stack = [];
let lines = content.split('\n');

let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let char = line[j];
        let nextChar = line[j+1];

        if (inComment) {
            if (char === '\n' || j === line.length - 1) inComment = false;
            continue;
        }
        if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
                inBlockComment = false;
                j++;
            }
            continue;
        }
        if (inString) {
            if (char === stringChar) {
                // Check if escaped
                let backslashes = 0;
                let k = j - 1;
                while (k >= 0 && line[k] === '\\') {
                    backslashes++;
                    k--;
                }
                if (backslashes % 2 === 0) {
                    inString = false;
                    stringChar = '';
                }
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inComment = true;
            j++;
            continue;
        }
        if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            j++;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, line: i + 1, col: j + 1 });
        } else if (char === '}' || char === ')' || char === ']') {
            if (stack.length === 0) {
                console.log(`Extra closing ${char} on line ${i + 1}, col ${j + 1}`);
                continue;
            }
            let last = stack.pop();
            if ((char === '}' && last.char !== '{') ||
                (char === ')' && last.char !== '(') ||
                (char === ']' && last.char !== '[')) {
                console.log(`Mismatched ${char} on line ${i + 1}, col ${j + 1}, expected closing for ${last.char} from line ${last.line}, col ${last.col}`);
            }
        }
    }
}

if (stack.length > 0) {
    stack.forEach(unclosed => {
        console.log(`Unclosed ${unclosed.char} on line ${unclosed.line}, col ${unclosed.col}`);
    });
} else {
    console.log('Brackets balanced (ignoring comments/strings)!');
}
