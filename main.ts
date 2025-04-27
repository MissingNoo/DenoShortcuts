import * as child_process from "node:child_process";
import commands from "./commands.json" with { type: "json" };
import html from "./html.json" with { type: "json" };
if (Deno.args[0] != undefined) {
  Deno.env.set("ip", Deno.args[0]);
}
// deno-lint-ignore prefer-const no-explicit-any
let pages: any = {};
function exec(command: string, show_output = false) {
  child_process.exec(command, (err, stdout, _stderr) => {
    if (err) {
      // node couldn't execute the command
      return;
    }
    if (show_output) {
      console.log(`${stdout}`);
    }
  });
}

const fullscreen_button = html.fullscreen_button;

function generate_page(name: string) {
  let basehtml = html.page_start;
  commands.elements.forEach((element) => {
    if (element.name == name) {
      if (element.name != "Home") {
        basehtml += html.back_button; //Adds back button if not on home page
      }
      element.buttons.forEach((element) => { //Adds the buttons on the page
        let style = "";
        /*if (element.image != undefined) {
          style = 'style="width : 100px; height : 74px;  background: url(static/' +
            element.image +
            '); background-repeat: no-repeat; background-size: auto 100%; background-position: center center; color: transparent;"';
        }*/
        switch (element.type) {
          case "Folder":
            basehtml += '<a href="' + element.name +
              '" class="button"><i class="fa-solid fa-folder-open"></i>' +
              element.name + "</a>\n";
            break;
          default:
            if (element.show == undefined) {
              element.show = element.name;
            }
            basehtml += "<button " + style + ' id="' + element.name + '"> ' +
              element.show + " </button>\n";
            break;
        }
      });
      basehtml += "<script> let socket = new WebSocket('ws://" +
        Deno.env.get("ip") + ":4242'); </script>";
      basehtml += fullscreen_button;
      element.buttons.forEach((element) => { //Adds Javascript for the buttons
        switch (element.type) {
          case "Folder":
            break;
          default:
            basehtml += "document.getElementById('" + element.name +
              "').addEventListener('click', () => { socket.send('" +
              element.up + "'); });\n";
            break;
        }
      });
      basehtml = basehtml + html.page_end;
      pages[element.name] = basehtml;
    }
  });
}
//Generate the pages
commands.elements.forEach((element) => {
  generate_page(element.name);
});

exec('qrencode -m 2 -t utf8 "http://' + Deno.env.get("ip") + ':8000"', true);
Deno.serve((req) => {
  let body;
  let status = 200;
  const url = new URL(req.url);
  //console.log(url.pathname);
  if (url.pathname.match("/static")) {
    body = Deno.readFileSync(url.pathname.replace("/static", "static"));
  } else if (url.pathname.match("favicon.ico")) {
    body = Deno.readFileSync("static/favicon.ico");
  } else {
    const obody = pages[url.pathname.replace("/", "")];
    Deno.writeTextFileSync("/tmp/page.html", obody);
    body = Deno.readFileSync("/tmp/page.html");
    if (obody == undefined) {
      body = "Page not found!";
      status = 400;
    }
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
  socket.addEventListener("message", (event) => {
    //console.log(event.data);
    exec(event.data);
  });
  return response;
});
