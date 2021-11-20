 <template>
  <div id="app">
    <div class="Viewer" ref="viewer">
      <div class="pdfViewer"></div>
    </div>
    <!-- <router-view ></router-view> -->
  </div>
</template>

<script>
const pdfjsLib = require("pdfjs-dist/webpack");
const CMAP_URL = "../node_modules/pdfjs-dist/cmaps/";
const CMAP_PACKED = true;
import "pdfjs-dist/legacy/web/pdf_viewer.css";
import {
  EventBus,
  PDFViewer,
  PDFLinkService,
  PDFScriptingManager,
  PDFFindController,
} from "pdfjs-dist/web/pdf_viewer.js";
// import "pdfjs-dist/web/";
export default {
  name: "App",
  components: {},
  data() {
    return {};
  },
  watch: {
    $route(to) {},
  },
  methods: {},
  mounted() {
    let eventBus = new EventBus();
    this._eventBus = eventBus;
    let viewerContainer = this.$refs.viewer;

    const pdfLinkService = new PDFLinkService({
      eventBus,
    });

    // (Optionally) enable find controller.
    const pdfFindController = new PDFFindController({
      eventBus,
      linkService: pdfLinkService,
    });

    // (Optionally) enable scripting support.
    const pdfScriptingManager = new PDFScriptingManager({
      eventBus,
      sandboxBundleSrc: "../node_modules/pdfjs-dist/build/pdf.sandbox.js",
    });
    this._pdfViewer = new PDFViewer({
      container: viewerContainer,
      eventBus: this._eventBus,
      linkService: pdfLinkService,
      findController: pdfFindController,
      scriptingManager: pdfScriptingManager,
      enableScripting: true,
    });
    pdfLinkService.setViewer(this._pdfViewer);
    pdfScriptingManager.setViewer(this._pdfViewer);
    eventBus.on("pagesinit", () => {
      // We can use pdfViewer now, e.g. let's change default scale.
      this._pdfViewer.currentScaleValue = "page-width";
    });
    let loadingTask = pdfjsLib.getDocument({
      url: "public/compressed.tracemonkey-pldi-09.pdf",
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      ENABLE_XFA: true,
    });
    loadingTask.promise.then(
      (doc) => {
        this._pdfViewer.setDocument(doc);
        pdfLinkService.setDocument(doc, null);
      },
      (reason) => {}
    );
  },
  beforeDestroy() {},
};
</script>
<style  scoped>
#app {
  /* position: absolute; */
}
.Viewer {
  position: absolute;
  /* width: 800px;
  height: 800px;
  left: 0;
  top: 0; */
}
</style>



