<template>
  <div class="PDFViewer" :data-pdfjsprinting="pdfjsprinting" ref="PDFViewer">
    <div class="spinning" v-show="isloding">
      <a-spin :spinning="isloding" />
    </div>
    <div class="toolBus">
      <div class="pagination">
        <button
          class="toolbarButton pageUp"
          title="上一页"
          @click="changePage(currentPageNumber - 1)"
          :disabled="currentPageNumber === 1"
        ></button>
        <div class="splitToolbarButtonSeparator"></div>
        <button
          class="toolbarButton pageDown"
          title="下一页"
          @click="changePage(currentPageNumber + 1)"
          :disabled="currentPageNumber === numPages"
        ></button>
        <input
          type="number"
          class="toolbarButton page-number-input"
          v-model="currentPageNumber"
          @keydown.enter="changePage(currentPageNumber)"
          @blur="changePage(currentPageNumber)"
        />
        <span class="toolbarLabel">/ {{ numPages }}</span>
      </div>
      <div class="toolbarViewerMiddle">
        <div class="splitToolbarButton">
          <button
            class="toolbarButton zoomOut"
            title="缩小"
            tabindex="21"
            @click="changeCurrentScaleValue($event, -0.2)"
          >
            <span></span>
          </button>
          <div class="splitToolbarButtonSeparator"></div>
          <button
            class="toolbarButton zoomIn"
            title="放大"
            @click="changeCurrentScaleValue($event, 0.2)"
          >
            <span></span>
          </button>
        </div>
        <span class="scaleSelectContainer">
          <select
            class="scaleSelect"
            title="缩放"
            :value="currentScaleValue"
            @change="changeCurrentScaleValue"
          >
            <option title value="auto" selected="selected">自动缩放</option>
            <option title value="page-actual">实际大小</option>
            <option title value="page-fit">适合页面</option>
            <option title value="page-width">适合页宽</option>
            <option title value="custom" disabled="disabled" hidden="true">{{ customScaleValue }}</option>
            <option
              v-for="item in scaleSelectArray"
              :key="item.value"
              :value="item.value"
            >{{ item.text }}</option>
          </select>
        </span>
      </div>

      <div class="findTool" v-show="isneedSearch">
        <input type="text" class="searchInput" @keyup.enter="setSearcher($event)" />
        <span class="toolbarViewerMiddlefindTool" v-show="matchesCount.total">
          <button
            class="toolbarButton prev"
            title="上一个"
            @click="setSearcher($event, { findPrevious: true })"
          >
            <span></span>
          </button>
          <div class="splitToolbarButtonSeparator"></div>
          <button
            class="toolbarButton next"
            title="下一个"
            @click="setSearcher($event, { findPrevious: false })"
          >
            <span></span>
          </button>
        </span>
        <span v-show="matchesCount.total" class="tip">
          <span>第 {{ matchesCount.current }} 项, 共匹配 {{ matchesCount.total }} 项</span>
        </span>
      </div>
      <div class="pdf-control-zoom">
        <span @click="downloadClick" class="down" title="下载"></span>
        <span @click="print" class="print" title="打印"></span>
        <span @click="fullview" class="fullview" title="全屏"></span>
      </div>
    </div>

    <div class="viewerContainer" ref="viewerContainer">
      <div class="innerContainer" ref="innerContainer" />
    </div>
    <div class="printContainer" ref="printContainer"></div>
    <a-modal
      v-model:visible="isPrintting"
      :closable="false"
      :okText="null"
      class="printingModal"
      @cancel="handleCancel"
      :getContainer="_ => $refs.PDFViewer"
    >
      <template #footer>
        <a-button key="back" @click="handleCancel" class="printingModalCancelButton">取消</a-button>
      </template>
      正在准备打印文件
      <span class="dotting"></span>
      <img src="../node_modules/pdfjs-dist" alt srcset />
      <a-progress :percent="print_progress_percent" status="active" />
    </a-modal>
  </div>
</template>

<script>
const pdfJS = require('pdfjs-dist/webpack');
import { PDFLinkService, PDFFindController, PDFViewer, PDFScriptingManager, EventBus } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';

const CSS_UNITS = 96.0 / 72.0;
const PRINT_RESOLUTION = 150;
const PRINT_UNITS = PRINT_RESOLUTION / 72.0;
const CMAP_URL = '/cmaps/';
const SANDBOX_BUNDLE_SRC = '/pdf.sandbox.js';
const CMAP_PACKED = true;
const ENABLE_XFA = true;
export default {
  props: {
    pdfUrl: {
      default: '/compressed.tracemonkey-pldi-09.pdf'
    },
    isneedSearch: {
      default: true //是否启动搜索
    },
    minscale: {
      default: 0.5 //最小放大倍数
    },
    maxscale: {
      default: 4 //最大放大倍数
    },
    defaultScaleValue: {
      default: 'auto'
    }
  },
  data() {
    return {
      pdfDoc: null, // pdfjs 生成的对象
      filename: '', //
      printStyle: null,
      pdfjsprinting: false,
      numPages: 0,
      matchesCount: {
        total: 0,
        current: 0
      },
      currentScaleValue: this.defaultScaleValue,
      currentPageNumber: 1,
      viewer: null,
      searcher: {
        phraseSearch: true,
        query: '',
        findPrevious: false,
        highlightAll: false
      },
      customScaleValue: '100%',
      scaleSelectArray: [
        {
          value: '0.5',
          text: '50%'
        },
        {
          value: '0.75',
          text: '75%'
        },
        {
          value: '1',
          text: '100%'
        },
        {
          value: '1.25',
          text: '125%'
        },
        {
          value: '1.5',
          text: '150%'
        },
        {
          value: '2',
          text: '200%'
        },
        {
          value: '3',
          text: '300%'
        },
        {
          value: '4',
          text: '400%'
        }
      ],
      print_progress_percent2dot: 0, //print准备前进度
      isPrintting: false, //开启打印
      isloding: true //加载pdf
    };
  },
  watch: {
    defaultScaleValue(currentScaleValue) {
      this.changeCurrentScaleValue(null, currentScaleValue);
    }
  },
  computed: {
    print_progress_percent() {
      return Math.floor(this.print_progress_percent2dot * 100);
    }
  },
  async created() {
    const filename = this.getPDFFileNameFromURL(this.pdfUrl);
    this.filename = filename;
    document.title = filename;
    document.body.style['user-select'] = 'auto';
  },
  async mounted() {
    await this.$nextTick();
    this.init();
    document.documentElement.setAttribute('mozdisallowselectionprint', 'true');
  },
  beforeUnmount() {
    this._removeFullscreenChangeListeners();
    this.bindEventBus?.removeSelfFn?.();
  },
  methods: {
    isDataSchema(url) {
      let i = 0,
        ii = url.length;
      while (i < ii && url[i].trim() === '') {
        i++;
      }
      return url.substring(i, i + 5).toLowerCase() === 'data:';
    },
    getPDFFileNameFromURL(url, defaultFilename = 'document.pdf') {
      if (typeof url !== 'string') {
        return defaultFilename;
      }
      if (this.isDataSchema(url)) {
        console.warn('getPDFFileNameFromURL: ' + 'ignoring "data:" URL for performance reasons.');
        return defaultFilename;
      }
      const reURI = /^(?:(?:[^:]+:)?\/\/[^\/]+)?([^?#]*)(\?[^#]*)?(#.*)?$/;
      //            SCHEME        HOST         1.PATH  2.QUERY   3.REF
      // Pattern to get last matching NAME.pdf
      const reFilename = /[^\/?#=]+\.pdf\b(?!.*\.pdf\b)/i;
      let splitURI = reURI.exec(url);
      let suggestedFilename =
        reFilename.exec(splitURI[1]) || reFilename.exec(splitURI[2]) || reFilename.exec(splitURI[3]);
      if (suggestedFilename) {
        suggestedFilename = suggestedFilename[0];
        if (suggestedFilename.includes('%')) {
          // URL-encoded %2Fpath%2Fto%2Ffile.pdf should be file.pdf
          try {
            suggestedFilename = reFilename.exec(decodeURIComponent(suggestedFilename))[0];
          } catch (ex) {
            // Possible (extremely rare) errors:
            // URIError "Malformed URI", e.g. for "%AA.pdf"
            // TypeError "null has no properties", e.g. for "%2F.pdf"
          }
        }
      }
      return suggestedFilename || defaultFilename;
    },
    useRenderedPage(printItem) {
      let img = document.createElement('img');
      const printContainer = this.$refs.printContainer;
      img.style.width = printItem.width;
      img.style.height = printItem.height;

      let scratchCanvas = this.scratchCanvas;
      let isSuportToBlob = false;
      if ('toBlob' in scratchCanvas) {
        isSuportToBlob = true;
        scratchCanvas.toBlob(function (blob) {
          img.src = URL.createObjectURL(blob);
        });
      } else {
        img.src = scratchCanvas.toDataURL();
      }

      let wrapper = document.createElement('div');
      wrapper.appendChild(img);
      printContainer.appendChild(wrapper);

      return new Promise(function (resolve, reject) {
        img.onload = resolve;
        img.onerror = reject;
      }).then(_ => {
        if (isSuportToBlob && img.src) {
          URL.revokeObjectURL(img.src);
        }
      });
    },
    beforePrint() {
      return new Promise(res => {
        this.pdfDoc.getPage(1).then(page => {
          this.pdfjsprinting = true;
          const size = page.getViewport({ scale: 1 });
          this.printPageSize = size;
          let style = document.createElement('style');
          this.printStyle = style;
          let pageStyleSheetTextContent = `@supports ((size:A4) and (size:1pt 1pt)) {@page { size:auto;
      margin: 0mm;}} `;
          style.textContent = pageStyleSheetTextContent;
          document.body.appendChild(style);
          res('');
        });
      }).catch(_ => {
        return Promise.reject('');
      });
    },
    renderPagePrint(currentPage) {
      this.scratchCanvas = this.scratchCanvas || document.createElement('canvas');
      const scratchCanvas = this.scratchCanvas;
      // The size of the canvas in pixels for printing.
      const size = this.printPageSize;
      let scratchCanvasWidth = Math.floor(size.width * PRINT_UNITS);
      let scratchCanvasHeight = Math.floor(size.height * PRINT_UNITS);
      scratchCanvas.width = scratchCanvasWidth;
      scratchCanvas.height = scratchCanvasHeight;
      // The physical size of the img as specified by the PDF document.
      let width = Math.floor(size.width * CSS_UNITS) + 'px';
      let height = Math.floor(size.height * CSS_UNITS) + 'px';

      let ctx = scratchCanvas.getContext('2d');
      ctx.save();
      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillRect(0, 0, scratchCanvasWidth, scratchCanvasHeight);
      ctx.restore();

      return this.pdfDoc
        .getPage(currentPage)
        .then(function (pdfPage) {
          let renderContext = {
            canvasContext: ctx,
            transform: [PRINT_UNITS, 0, 0, PRINT_UNITS, 0, 0],
            viewport: pdfPage.getViewport({ scale: 1 }),
            intent: 'print'
          };
          return pdfPage.render(renderContext).promise;
        })
        .then(function () {
          return {
            width,
            height
          };
        });
    },
    renderPages() {
      let currentPage = 0;
      let pageCount = this.numPages;
      const cancelPromise = new Promise(resolve => {
        this.printtingAbortPromise = resolve;
      });
      let renderNextPage = (resolve, reject) => {
        cancelPromise.then(_ => {
          reject();
        });
        if (++currentPage > pageCount) {
          resolve();
          return;
        }
        this.print_progress_percent2dot = (currentPage / pageCount).toFixed(2);
        this.renderPagePrint(currentPage)
          .then(this.useRenderedPage)
          .then(function () {
            renderNextPage(resolve, reject);
          }, reject)
          .catch(reject);
      };
      return new Promise(renderNextPage);
    },
    performPrint() {
      return new Promise(resolve => {
        // Push window.print in the macrotask queue to avoid being affected by
        // the deprecation of running print() code in a microtask, see
        // https://github.com/mozilla/pdf.js/issues/7547.
        setTimeout(() => {
          window.print();
          // Delay promise resolution in case print() was not synchronous.
          setTimeout(resolve, 20); // Tidy-up.
        }, 0);
      });
    },
    resetPrintStatus() {
      this.printStyle?.remove();
      this.printStyle = null;
      const printContainer = this.$refs.printContainer;
      printContainer.textContent = '';
      this.isPrintting = false;
      this.print_progress_percent2dot = 0;
    },
    handleCancel() {
      this.printtingAbortPromise?.();
    },
    async print() {
      if (this.isPrintting) {
        return;
      } else {
        this.isPrintting = true;
      }
      this.beforePrint()
        .then(r => {
          this.renderPages()
            .then(() => {
              this.isPrintting = false;
              return this.performPrint();
            })
            .then(() => {
              this.resetPrintStatus();
            })
            .catch(_ => {
              this.resetPrintStatus();
            });
        })
        .catch(_ => this.resetPrintStatus());
    },
    changePage(currentPageNumber) {
      currentPageNumber = Number(currentPageNumber);
      if (currentPageNumber != currentPageNumber || !this.viewer) {
        return;
      }
      this.viewer.currentPageNumber = currentPageNumber;
    },
    setSearcher(e, obj) {
      if (!this.viewer) {
        return;
      }
      if (!obj) {
        this.searcher = {
          ...this.searcher,
          query: e.target.value,
          findPrevious: false
        };
      } else {
        this.searcher = {
          ...this.searcher,
          ...obj
        };
      }
      this.viewer.findController.executeCommand('findagain', this.searcher);
    },

    // 获取文件
    download(blobUrl, filename) {
      let a = document.createElement('a');
      if (!a.click) {
        throw new Error('DownloadManager: "a.click()" is not supported.');
      }
      a.href = blobUrl;
      a.target = '_parent';
      // Use a.download if available. This increases the likelihood that
      // the file is downloaded instead of opened by another PDF plugin.
      if ('download' in a) {
        a.download = filename;
      }
      // <a> must be in the document for IE and recent Firefox versions,
      // otherwise .click() is ignored.
      (document.body || document.documentElement).appendChild(a);
      a.click();
      a.remove();
    },
    downloadClick() {
      this.pdfDoc &&
        this.pdfDoc.getData().then(data => {
          const blob = new Blob([data], { type: 'application/pdf' });
          const filename = this.filename;
          if (navigator.msSaveBlob) {
            // IE10 and above
            return navigator.msSaveBlob(blob, filename);
          }
          let url = URL.createObjectURL(blob);
          this.download(url, filename);
        });
    },

    bindEventBus() {
      const bindEventBus = this.eventBus;
      const setFn = e => {
        this.matchesCount = e.matchesCount;
      };
      bindEventBus._on('updatefindcontrolstate', setFn);
      bindEventBus._on('updatefindmatchescount', setFn);
      const setFn2 = ({ source }) => {
        this.currentPageNumber = source.currentPageNumber;
      };
      bindEventBus._on('updateviewarea', setFn2);
      bindEventBus.removeSelfFn = () => {
        bindEventBus._off('updatefindcontrolstate', setFn);
        bindEventBus._off('updatefindmatchescount', setFn);
        bindEventBus._off('updateviewarea', setFn2);
        bindEventBus = null;
      };
    },
    // 初始化pdf
    init() {
      if (!this.pdfUrl) {
        return;
      }
      const eventBus = new EventBus();
      this.eventBus = eventBus;
      this.bindEventBus();
      const linkService = new PDFLinkService({
        eventBus
      });
      const findController = new PDFFindController({
        linkService,
        eventBus
      });
      const pdfScriptingManager = new PDFScriptingManager({
        eventBus,
        sandboxBundleSrc: SANDBOX_BUNDLE_SRC
      });
      const newViewer = new PDFViewer({
        container: this.$refs.viewerContainer,
        linkService,
        findController,
        eventBus,
        scriptingManager: pdfScriptingManager,
        enableScripting: true
      });
      linkService.setViewer(newViewer);
      pdfScriptingManager.setViewer(newViewer);
      // 设置初始缩放
      newViewer.currentScaleValue = this.currentScaleValue;
      pdfJS
        .getDocument({
          url: this.pdfUrl,
          cMapUrl: CMAP_URL,
          cMapPacked: CMAP_PACKED,
          enableXfa: ENABLE_XFA
        })
        .promise.then(pdfDoc_ => {
          newViewer.setDocument(pdfDoc_);
          linkService.setDocument(pdfDoc_, null);
          this.viewer = newViewer;
          this.numPages = pdfDoc_.numPages;
          this.pdfDoc = pdfDoc_;
          this.isloding = false;
        });
    },
    changeCurrentScaleValue(e, step) {
      if (!this.viewer) {
        return;
      }
      const minscale = this.minscale;
      const maxscale = this.maxscale;
      if (!step) {
        this.viewer.currentScaleValue = e.target.value;
        this.currentScaleValue = e.target.value;
      } else {
        let currentScale = this.viewer.currentScale;
        let currentScaleValue = (currentScale + step).toFixed(2);
        if (currentScaleValue < minscale) {
          currentScaleValue = minscale;
        }
        if (currentScaleValue > maxscale) {
          currentScaleValue = maxscale;
        }
        const scaleSelectArray = this.scaleSelectArray;
        let has = false;
        for (let index = 0; index < scaleSelectArray.length; index++) {
          const { value } = scaleSelectArray[index];
          if (value == currentScaleValue) {
            has = true;
            break;
          }
        }
        this.viewer.currentScaleValue = currentScaleValue;
        if (!has) {
          this.customScaleValue = (currentScaleValue * 100).toFixed(0) + '%';
          this.$nextTick(() => {
            this.currentScaleValue = 'custom';
          });
        } else {
          this.currentScaleValue = currentScaleValue;
        }
      }
    },
    isFullscreen() {
      return !!(
        document.fullscreenElement ||
        document.mozFullScreen ||
        document.webkitIsFullScreen ||
        document.msFullscreenElement
      );
    },
    _fullscreenChange() {
      if (this.isFullscreen()) {
        this.isfullscreenActive = true;
      } else {
        this.isfullscreenActive = false;
      }
    },
    _addFullscreenChangeListeners() {
      ['fullscreenchange', 'fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'].forEach(fnName => {
        document.addEventListener(fnName, this._fullscreenChange);
      });
    },
    _removeFullscreenChangeListeners() {
      ['fullscreenchange', 'fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'].forEach(fnName => {
        document.removeEventListener(fnName, this._fullscreenChange);
      });
    },
    full(ele) {
      if (ele.requestFullscreen) {
        ele.requestFullscreen();
      } else if (ele.mozRequestFullScreen) {
        ele.mozRequestFullScreen();
      } else if (ele.webkitRequestFullscreen) {
        ele.webkitRequestFullscreen();
      } else if (ele.msRequestFullscreen) {
        ele.msRequestFullscreen();
      }
    },
    fullview() {
      const container = this.$refs.viewerContainer;
      this.full(container);
    }
  }
};
</script>

<style scoped lang="less">
.printContainer {
  display: none;
}
@media print {
  body {
    height: auto !important;
    background: transparent none;
    .wrap {
      overflow: unset !important;
    }
  }
  [data-pdfjsprinting] .viewerContainer {
    display: none;
  }
  [data-pdfjsprinting] .printContainer {
    display: block;
  }
  [data-pdfjsprinting] .toolBus {
    display: none !important;
  }
  .printContainer {
    height: 100%;
    font-size: 0 !important;
  }
  /* wrapper around (scaled) print canvas elements */
  .printContainer > div {
    position: relative;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    page-break-after: always;
    page-break-inside: avoid;
  }
  .printContainer img {
    display: block;
  }
}
.innerContainer {
  /deep/ .page {
    position: relative;
    margin: 0 auto 8px;
    background-clip: unset;
    border: none;
    box-sizing: content-box;
  }
}

.viewerContainer {
  position: absolute;
  overflow: auto;
  width: 100%;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding-top: 32px;
  background-color: #404040;
  ::selection {
    background: rgba(0, 0, 255);
    color: transparent;
  }
}

.zoomOutOrInBefore {
  position: absolute;
  display: inline-block;
  top: 4px;
  left: 7px;
}
.toolbarButtonAll {
  float: left;
  padding: 2px 6px 0;
  border: 1px solid transparent;
  border-radius: 2px;
  color: hsla(0, 0%, 100%, 0.8);
  font-size: 12px;
  line-height: 14px;
  width: 32px;
  height: 25px;
  background: none;
  position: relative;
  margin: 0;
  cursor: pointer;
}
.toolBus {
  height: 32px;
  background-color: #404040;
  line-height: 30px;
  position: fixed;
  width: 100%;
  flex-direction: row;
  z-index: 1;
  box-shadow: inset 0 1px 1px hsl(0deg 0% 0% / 15%),
    inset 0 -1px 0 hsl(0deg 0% 100% / 5%), 0 1px 0 hsl(0deg 0% 0% / 15%),
    0 1px 1px hsl(0deg 0% 0% / 10%);
  .splitToolbarButtonSeparator {
    float: left;
    height: 18px;
    width: 1px;
    background-color: #000;
    overflow: visible;
    z-index: 99;
    margin-top: 4px;
  }
  .pagination {
    margin: 3px 2px 4px 5px;
    float: left;

    .toolbarLabel {
      float: left;
      min-width: 16px;
      padding: 0 6px 0 2px;
      height: 25px;
      border: 1px solid transparent;
      border-radius: 2px;
      color: hsl(0, 0%, 85%);
      font-size: 12px;
      line-height: 25px;
      text-align: left;
    }
    .toolbarButton {
      .toolbarButtonAll;
      &.pageUp {
        margin-right: -1px;
        border-top-left-radius: 2px;
        border-bottom-left-radius: 2px;
        border-right-color: transparent;
        &:hover {
          .pageupOrdownHover;
        }
        &::before {
          .pageupOrdownBefore;
          content: url("../src/assets/icons/pdf/toolbarButton-pageUp.png");
        }
      }
      &.pageDown {
        margin-left: -1px;
        border-top-right-radius: 2px;
        border-bottom-right-radius: 2px;
        border-left-color: transparent;
        &:hover {
          .pageupOrdownHover;
        }
        &::before {
          .pageupOrdownBefore;
          content: url("../src/assets/icons/pdf/toolbarButton-pageDown.png");
        }
      }
      &.page-number-input {
        position: relative;
        float: left;
        min-width: 16px;
        text-align: right;
        padding: 3px 6px;
        border-radius: 2px;
        background-color: hsla(0, 0%, 100%, 0.09);
        background-image: linear-gradient(
          hsla(0, 0%, 100%, 0.05),
          hsla(0, 0%, 100%, 0)
        );
        background-clip: padding-box;
        border: 1px solid hsla(0, 0%, 0%, 0.35);
        border-color: hsla(0, 0%, 0%, 0.32) hsla(0, 0%, 0%, 0.38)
          hsla(0, 0%, 0%, 0.42);
        color: hsl(0, 0%, 95%);
        font-size: 12px;
        line-height: 14px;
        outline-style: none;
        &:focus {
          border-color: hsla(204, 100%, 65%, 0.8) hsla(204, 100%, 65%, 0.85)
            hsla(204, 100%, 65%, 0.9);
        }
        &::-webkit-outer-spin-button {
          -webkit-appearance: none;
        }
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
        }
      }
    }
  }

  .toolbarViewerMiddle {
    position: absolute;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);
    .splitToolbarButton {
      float: left;
      margin: 3px 2px 4px 0;
      white-space: nowrap;
      width: 65px;
      height: 26px;
      .toolbarButton {
        .toolbarButtonAll;
        &:hover {
          .pageupOrdownHover;
        }
        &.zoomOut {
          margin-right: -1px;
          border-top-left-radius: 2px;
          border-bottom-left-radius: 2px;
          border-right-color: transparent;
          &::before {
            .zoomOutOrInBefore;
            content: url("../src/assets/icons/pdf/toolbarButton-zoomOut.png");
          }
        }
        &.zoomIn {
          margin-left: -1px;
          border-top-right-radius: 2px;
          border-bottom-right-radius: 2px;
          border-left-color: transparent;
          &:hover {
            .pageupOrdownHover;
          }
          &::before {
            .zoomOutOrInBefore;
            content: url("../src/assets/icons/pdf/toolbarButton-zoomIn.png");
          }
        }
      }
    }
    .scaleSelectContainer {
      float: left;
      margin: 0 2px 0 0;
      min-width: 82px;
      max-width: 82px;
      width: 120px;
      padding: 0;
      overflow: hidden;
      font-size: 12px;
      color: hsl(0, 0%, 95%);
      padding: 0;
      overflow: hidden;
      background: url(../src/assets/icons/pdf/toolbarButton-menuArrows.png)
        no-repeat;
      background-position: 95%;
      border: 1px solid hsla(0, 0%, 0%, 0.35);
      border-color: hsla(0, 0%, 0%, 0.32) hsla(0, 0%, 0%, 0.38)
        hsla(0, 0%, 0%, 0.42);
      .scaleSelect {
        min-width: 104px;
        font-size: 12px;
        color: hsl(0, 0%, 95%);
        margin: 0;
        padding: 3px 2px 2px;
        border: none;
        background: rgba(0, 0, 0, 0);
        outline: unset;
        option {
          background: hsl(0, 0%, 24%);
        }
      }
    }
  }
}
.pageupOrdownHover {
  background-color: hsla(0, 0%, 0%, 0.2);
  z-index: 199;
  background-image: linear-gradient(
    hsla(0, 0%, 100%, 0.05),
    hsla(0, 0%, 100%, 0)
  );
  background-clip: padding-box;
  border: 1px solid hsla(0, 0%, 0%, 0.35);
  border-color: hsla(0, 0%, 0%, 0.32) hsla(0, 0%, 0%, 0.38)
    hsla(0, 0%, 0%, 0.42);
}
.pageupOrdownBefore {
  position: absolute;
  display: inline-block;
  top: 4px;
  left: 7px;
}

.findTool {
  position: absolute;
  left: 180px;
  height: 25px;
  top: 0;
  bottom: 0;
  margin: auto;
  width: 400px;
  text-align: left;
  &::after {
    position: absolute;
    display: inline-block;
    top: 4px;
    left: 2px;
    content: url("../src/assets/icons/pdf/toolbarButton-search.png");
  }
  .searchInput {
    outline: unset;
    height: 100%;
    background-color: hsla(0, 0%, 100%, 0.09);
    color: hsl(0, 0%, 95%);
    font-size: 12px;
    line-height: 14px;
    padding-left: 25px;
    float: left;
  }
  & > .tip {
    margin-left: 5px;
    color: hsl(0, 0%, 85%);
    font-size: 12px;
    line-height: 25px;
    float: left;
  }
  .toolbarViewerMiddlefindTool {
    float: left;
    margin-left: 5px;
    .toolbarButton {
      .toolbarButtonAll;
      &:hover {
        .pageupOrdownHover;
      }
      &.prev {
        margin-right: -1px;
        border-top-left-radius: 2px;
        border-bottom-left-radius: 2px;
        border-right-color: transparent;
        &::before {
          .zoomOutOrInBefore;
          content: url("../src/assets/icons/pdf/findbarButton-previous.png");
        }
      }
      &.next {
        margin-left: -1px;
        border-top-right-radius: 2px;
        border-bottom-right-radius: 2px;
        border-left-color: transparent;
        &:hover {
          .pageupOrdownHover;
        }
        &::before {
          .zoomOutOrInBefore;
          content: url("../src/assets/icons/pdf/findbarButton-next.png");
        }
      }
    }
  }
}
.pdf-control-zoom {
  float: right;
  margin-top: 3px;
  margin-right: 5px;
  & > span {
    width: 32px;
    color: hsl(0, 0%, 85%);
    font-size: 12px;
    text-align: center;
    margin-right: 2px;
    display: inline-block;
    .toolbarButtonAll;
    position: relative;
    cursor: pointer;
    &:hover {
      .pageupOrdownHover;
    }
    &.down {
      &::after {
        content: url("../src/assets/icons/pdf/toolbarButton-download.png");
      }
    }
    &.print {
      &::after {
        content: url("../src/assets/icons/pdf/toolbarButton-print.png");
      }
    }
    &.fullview {
      &::after {
        content: url("../src/assets/icons/pdf/toolbarButton-presentationMode.png");
      }
    }
  }
}
@keyframes dot {
  25% {
    box-shadow: none;
  }
  50% {
    box-shadow: 2px 0 currentColor;
  }
  75% {
    box-shadow: 2px 0 currentColor, 6px 0 currentColor;
  }
}
.PDFViewer {
  :deep(.printingModal) {
    line-height: 14px;
    top: 0;
    bottom: 0;
    margin: auto;
    height: 70px;
    padding: 15px;
    left: 0;
    right: 0;
    position: fixed;
    width: 180px !important;
    border: 1px solid hsla(0, 0%, 0%, 0.5);
    border-radius: 4px;
    box-shadow: 0 1px 4px rgb(0, 0, 0 / 30%);
    box-sizing: content-box;
    background-color: #474747;
    overflow: hidden;
    .dotting {
      display: inline-block;
      min-width: 2px;
      min-height: 2px;
      box-shadow: 2px 0 currentColor, 6px 0 currentColor, 10px 0 currentColor;
      animation: dot 4s infinite step-start both;
      border-radius: 50%;
    }

    .ant-modal-body {
      width: 100%;
      font-size: 12px;
      margin: 0;
      padding: 0;
    }
    .ant-modal-content {
      background-color: #474747;
      text-align: left;
      color: hsl(0, 0%, 85%);
      box-shadow: unset;
    }
    .ant-modal-footer {
      border: unset;
      text-align: center;
      height: 30px;
      padding: 0;
    }
    .ant-progress-line {
      margin-top: 5px;
    }
    .ant-progress-text {
      border-spacing: 4px;
      color: hsl(0, 0%, 85%);
      font-size: 12px;
      line-height: 14px;
    }
    .printingModalCancelButton {
      border-radius: 4px;
      margin: 10px 4px 2px 4px !important;
      padding: 2px 6px 3px 6px;
      border-radius: 2px;
      color: hsla(0, 0%, 100%, 0.8);
      font-size: 12px;
      line-height: 14px;
      min-width: 16px;
      background-color: hsla(0, 0%, 0%, 0.12);
      outline: unset;
      border: 1px solid hsla(0, 0%, 0%, 0.35);
      height: 25px;
      overflow: hidden;
      display: inline-block;
      &:hover {
        .pageupOrdownHover;
      }
    }
  }
}
.spinning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 100px;
  text-align: center;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.6);
}
</style>
