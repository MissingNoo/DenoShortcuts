import * as util from "node:util";
import * as child_process from "node:child_process";
import commands from "./commands.json" with { type: "json" };

export function exec(command: string, show_output = false){
  child_process.exec(command, (err, stdout, stderr) => {
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

commands.elements.forEach(element => {
  let basehtml = '<!DOCTYPE html><html lang="en"><head>  <meta charset="UTF-8">    <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1">  <title>WebSocket Demo</title>  </head><style> a.button {    padding: 1px 6px;    border: 1px outset buttonborder;    border-radius: 3px;    color: buttontext;    background-color: buttonface;    text-decoration: none;}  body {    background-color: black;  }  button {    margin-top: 5px;    padding: 29px;    background-color: black;    color: white;  }</style><body>\n'
  if (element.name != "Home") {
    basehtml = basehtml + '<a href="Home" class="button">Back</a>\n';
  }
  element.buttons.forEach(element => {
    let style = "";
    if (element.image != undefined) {
      style = 'style="width : 100px; height : 74px;  background: url(static/' + element.image + '); background-repeat: no-repeat; background-size: auto 100%; background-position: center center; color: transparent;"';
      //element.name = "";
    }
    switch (element.type) {
      case "Folder":
        basehtml = basehtml + '<a href="' + element.name + '" class="button">' + element.name + '</a>\n';
        break;
      default:
        basehtml = basehtml + '<button ' + style + ' id="' + element.name + '"> ' + element.name + ' </button>\n';
        break;
    }
  });
  basehtml = basehtml + "<script> let socket = new WebSocket('ws://192.168.0.105:4242');";
  element.buttons.forEach(element => {
    switch (element.type) {
      case "Folder":
        break;
      default:
        basehtml = basehtml + "document.getElementById('" + element.name + "').addEventListener('click', () => { socket.send('" + element.up + "'); });\n"
        break;
    }
    
  });
  basehtml = basehtml + "</script></body></html>";
  Deno.writeTextFile("pages/" + element.name + ".html", basehtml);
});

exec('qrencode -m 2 -t utf8 "http://192.168.0.105:8000"', true);
Deno.serve((req) => {
  let body;
  const url = new URL(req.url);
  //console.log(url.pathname);
  if (url.pathname.match(".png")) {
    //console.log(url.pathname.replace("/s", "s"));
    body = Deno.readFileSync(url.pathname.replace("/s", "s"));
  }
  else {
    body = Deno.readFileSync("pages" + url.pathname + ".html");
  }
  return new Response(body, {
    status: 404
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

