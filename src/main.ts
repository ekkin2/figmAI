import { once, showUI } from '@create-figma-plugin/utilities'

import { htmlToFigma } from '@builder.io/html-to-figma';
import { CloseHandler, CreateRectanglesHandler, GPTHandler } from './types'

/**
 * Fetches requests from given endpoint of ChatGPTAPI intermediate server.
 * @private
 * @param endpoint  endpoint for request type
 * @param message   optional body message
 */
 const chatAPIFetch = async (endpoint: string = '', message: string = ''):
  Promise<Response> => {
      return await fetch(`http://localhost:3000/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({
      //   "t
      // }),
  });
};

export default function () {
  once<CreateRectanglesHandler>('CREATE_RECTANGLES', async function (count: number) {
    // example(); // TODO: move this into its own function
    // const api = new ChatGPTAPI({
    //   apiKey: API_KEY,
    // })
    
    console.log("HERE!");
    console.log("Trying open ai...");
    // const response = await openai.createCompletion({ 
    //   model: "text-davinci-003",
    //   prompt: "Write a blog post on vadala onions",
    //   temperature: 0.7,
    //   max_tokens: 256,
    //   top_p: 1,
    //   frequency_penalty: 0,
    //   presence_penalty: 0,
    // })
    // console.log(response); 

    figma.closePlugin();
  })
  once<CloseHandler>('CLOSE', function () {
    figma.closePlugin()
  })
  once('GPT', async function (layers) {
  
    console.log("GPT!", layers);

    type AnyStringMap = { [key: string]: any };

    function assign(a: BaseNode & AnyStringMap, b: AnyStringMap) {
      for (const key in b) {
        const value = b[key];
        if (key === "data" && value && typeof value === "object") {
          const currentData =
            JSON.parse(a.getSharedPluginData("builder", "data") || "{}") || {};
          const newData = value;
          const mergedData = Object.assign({}, currentData, newData);
          // TODO merge plugin data
          a.setSharedPluginData("builder", "data", JSON.stringify(mergedData));
        } else if (
          typeof value != "undefined" &&
          ["width", "height", "type", "ref", "children", "svg"].indexOf(key) === -1
        ) {
          try {
            a[key] = b[key];
          } catch (err) {
            console.warn(`Assign error for property "${key}"`, a, b, err);
          }
        }
      }
    }
    const hasChildren = (node: unknown): node is ChildrenMixin =>
      !!(node && (node as any).children);
    async function traverseLayers(
      layer: SceneNode,
      cb: (layer: SceneNode, parent: BaseNode | null) => void,
      parent: BaseNode | null = null
    ) {
      if (layer) {
        await cb(layer, parent);
      }
      if (hasChildren(layer)) {
        for (const child of layer.children) {
          await traverseLayers(child, cb, layer);
        }
      }
    }

    const fontCache: { [key: string]: FontName | undefined } = {};

    // convert layers into html stuff
    const availableFonts = (await figma.listAvailableFontsAsync()).filter(
      (font) => font.fontName.style === "Regular"
    );
    const defaultFont = { family: "Roboto", style: "Regular" };
    await figma.loadFontAsync(defaultFont);
    
    const rects: SceneNode[] = [];
    let baseFrame: PageNode | FrameNode = figma.currentPage;
    // TS bug? TS is implying that frameRoot is PageNode and ignoring the type declaration
    // and the reassignment unless I force it to treat baseFrame as any
    let frameRoot: PageNode | FrameNode = baseFrame as any;
    console.log("main layers: ", layers); 
    for (const rootLayer of layers) {
      
      await traverseLayers(rootLayer as SceneNode, async (layer: any, parent) => {
        try {
          console.log("Layer type: ", layer.type); 
          if (layer.type === "FRAME" || layer.type === "GROUP") {
            const frame = figma.createFrame();
            frame.x = layer.x;
            frame.y = layer.y;
            frame.resize(layer.width || 1, layer.height || 1);
            assign(frame, layer);
            rects.push(frame);
            ((parent && (parent as any).ref) || baseFrame).appendChild(frame);
            layer.ref = frame;
            if (!parent) {
              frameRoot = frame;
              baseFrame = frame;
            }
            // baseFrame = frame;
          } else if (layer.type === "SVG") {
            const node = figma.createNodeFromSvg(layer.svg);
            node.x = layer.x;
            node.y = layer.y;
            node.resize(layer.width || 1, layer.height || 1);
            layer.ref = node;
            rects.push(node);
            assign(node, layer);
            ((parent && (parent as any).ref) || baseFrame).appendChild(node);
          } else if (layer.type === "RECTANGLE") {
            const rect = figma.createRectangle();
            // TODO: revive this
            // if (getImageFills(layer)) {
            //   await processImages(layer);
            // }
            assign(rect, layer);
            rect.resize(layer.width || 1, layer.height || 1);
            rects.push(rect);
            layer.ref = rect;
            ((parent && (parent as any).ref) || baseFrame).appendChild(rect);
          }
           else if (layer.type == "TEXT") {
            const text = figma.createText();
            // if (layer.fontFamily) {
            //   const cached = fontCache[layer.fontFamily];
            //   if (cached) {
            //     text.fontName = cached;
            //   } else {
            //     const family = await getMatchingFont(
            //       layer.fontFamily || "",
            //       availableFonts
            //     );
            //     text.fontName = family;
            //   }
            //   delete layer.fontFamily;
            // }
            assign(text, layer);
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
            text.characters = layer.characters; 
            layer.ref = text;
            text.resize(layer.width || 1, layer.height || 1);
            text.textAutoResize = "HEIGHT";
            const lineHeight =
              (layer.lineHeight && layer.lineHeight.value) || layer.height;
            let adjustments = 0;
            while (
              typeof text.fontSize === "number" &&
              typeof layer.fontSize === "number" &&
              (text.height > Math.max(layer.height, lineHeight) * 1.2 ||
                text.width > layer.width * 1.2)
            ) {
              // Don't allow changing more than ~30%
              if (adjustments++ > layer.fontSize * 0.3) {
                console.warn("Too many font adjustments", text, layer);
                // debugger
                break;
              }
              try {
                text.fontSize = text.fontSize - 1;
              } catch (err) {
                console.warn("Error on resize text:", layer, text, err);
              }
            }
            rects.push(text);
            ((parent && (parent as any).ref) || baseFrame).appendChild(text);
          }
        } catch (err) {
          console.warn("Error on layer:", layer, err);
        }
      });
    }
    if (frameRoot.type === "FRAME") {
      figma.currentPage.selection = [frameRoot];
    }

    figma.ui.postMessage({
      type: "doneLoading",
      rootId: frameRoot.id,
    });
    // console.log("document body: ", document.body); 
    // var el = document.createElement( 'html' );
    // el.innerHTML = "<html><head><title>titleTest</title></head><body><a href='test0'>test01</a><a href='test1'>test02</a><a href='test2'>test03</a></body></html>";
     // Live NodeList of your anchor elements
    // const parser = new DOMParser();
    // const htmlDoc = parser.parseFromString(txt, 'text/html');
    // const layers = htmlToFigma("<html><h1>welcome</h1></html>");
    // console.log("Layers: ", layers);
    figma.closePlugin(); 
    // fetch(`http://localhost:3000/`)
    //   .then((response) => {
    //     console.log(response);
    //     return response.json();
    //   }).then((data) => {
    //     console.log("text:", data);
    //     // todo: create text
    //     const textF = figma.createText()

    //     // Move to (50, 50)
    //     textF.x = 50
    //     textF.y = 50

    //     // Load the font in the text node before setting the characters
    //     textF.characters = 'Hello world!'

    //     // Set bigger font size and red color
    //     textF.fontSize = 18
    //     textF.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
    //     figma.closePlugin(); 
    //   }); 
      
  })

  showUI({
    height: 137,
    width: 240
  })
}
