import * as child_process from "node:child_process";
import commands from "./commands.json" with { type: "json" };

// deno-lint-ignore prefer-const no-explicit-any
let pages: any = {};

export function exec(command: string, show_output = false) {
  child_process.exec(command, (err, stdout, _stderr) => {
    if (err) {
      // node couldn't execute the command
      return;
    }
    // the *entire* stdout and stderr (buffered)
    if (show_output) {
      console.log(`${stdout}`);
    }
    //console.log(`stderr: ${stderr}`);
  });
}

const fullscreen_button = `<script>
       let socket = new WebSocket('ws://192.168.0.105:4242');
       function requestFullScreen() {

  var el = document.body;

  // Supports most browsers and their versions.
  var requestMethod = el.requestFullScreen || el.webkitRequestFullScreen 
  || el.mozRequestFullScreen || el.msRequestFullScreen;

  if (requestMethod) {

    // Native full screen.
    requestMethod.call(el);

  } else if (typeof window.ActiveXObject !== "undefined") {

    // Older IE.
    var wscript = new ActiveXObject("WScript.Shell");

    if (wscript !== null) {
      wscript.SendKeys("{F11}");
    }
  }
}
`;

function generate_page(name: string) {
  let basehtml = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1">
          <title>WebSocket Demo</title>
        </head>
        <style>
          a.button {    
            border-style: solid;
            border-width: 1px;
            border-color: white;
            margin-top: 5px;
            padding: 29px;
            background-color: black;
            color: white;
          }  
          body {    
            background-color: black;
          }  
          button {
            border-style: solid;
            border-color: white;
            border-width: 1px;
            margin-top: 5px;
            padding: 29px;
            background-color: black;
            color: white;
          }
        </style>
        <body>\n`;
  commands.elements.forEach((element) => {
    if (element.name == name) {
      if (element.name != "Home") {
        basehtml = basehtml + `
          <a href="#" class="button" onClick="requestFullScreen();">#</a>
          <a href="Home" class="button">Back</a>\n`;
      }
      element.buttons.forEach((element) => {
        // deno-lint-ignore prefer-const
        let style = "";
        if (element.image != undefined) {
          style = 'style="width : 100px; height : 74px;  background: url(static/' +
            element.image +
            '); background-repeat: no-repeat; background-size: auto 100%; background-position: center center; color: transparent;"';
        }
        switch (element.type) {
          case "Folder":
            basehtml = basehtml + '<a href="' + element.name +
              '" class="button">' +
              element.name + "</a>\n";
            break;
          default:
            basehtml = basehtml + "<button " + style + ' id="' + element.name +
              '"> ' + element.name + " </button>\n";
            break;
        }
      });
      basehtml = basehtml + fullscreen_button;
      element.buttons.forEach((element) => {
        switch (element.type) {
          case "Folder":
            break;
          default:
            basehtml = basehtml + "document.getElementById('" + element.name +
              "').addEventListener('click', () => { socket.send('" +
              element.up +
              "'); });\n";
            break;
        }
      });
      basehtml = basehtml + "</script></body></html>";
      //console.log(basehtml)
      pages[element.name] = basehtml;
      //console.log(pages[element.name]);
    }
  });
  //return "Page not found!";
}
commands.elements.forEach((element) => {
  generate_page(element.name);
});

exec('qrencode -m 2 -t utf8 "http://192.168.0.105:8000"', true);
Deno.serve((req) => {
  let body;
  let status = 200;
  const url = new URL(req.url);
  //console.log(url.pathname);
  if (url.pathname.match("/static")) {
    //console.log(url.pathname.replace("/static", "s"));
    body = Deno.readFileSync(url.pathname.replace("/static", "static"));
  } else if (url.pathname.match("favicon.ico")) {
    //console.log("favicon");
    body = Deno.readFileSync("static/favicon.ico");
  } else {
    //console.log(pages[url.pathname.replace("/", "")]);
    /*body = `
      <div dangerouslySetInnerHTML={{ __html: endresult }}>
      </div>`;*/
    const obody = pages[url.pathname.replace("/", "")];
    Deno.writeTextFileSync("/tmp/page.html", obody);
    body = Deno.readFileSync("/tmp/page.html");
    if (obody == undefined) {
      body = "Page not found!";
      status = 400;
    }
    //body = pages[url.pathname.replace("/", "")];
    //console.log(body);
    /*const path = "pages" + url.pathname + ".html";
    const pathFound = existsSync(path);
    if (pathFound) {
      body = Deno.readFileSync(path);
    } else {
      body = "Page not found!";
      status = 400;
    }*/
  }
  return new Response(body, {
    status: status,
  });
});

Deno.serve({ port: 4242 }, (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response(null, { status: 501 });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);

  /*socket.addEventListener("open", () => {
    console.log("A client just connected!");
  });*/
  socket.addEventListener("message", (event) => {
    //console.log(event.data);
    exec(event.data);
  });
  /*socket.addEventListener("close", () => {
    console.log("Disconnected!");
  });*/
  return response;
});
