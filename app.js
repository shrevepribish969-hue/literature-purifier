// 全角英文字母及数字转半角函数（保留中文特定标点）
function toDBC(str) {
  if (!str) return "";
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 12288) { // 全角空格
      result += String.fromCharCode(32);
    } else if (code >= 65281 && code <= 65374) {
      // 仅转换全角英文字母（Ａ-Ｚ、ａ-ｚ）与全角数字（０-９）
      const isFullWidthLetterOrDigit = 
        (code >= 65313 && code <= 65338) || 
        (code >= 65345 && code <= 65370) || 
        (code >= 65296 && code <= 65305);
      if (isFullWidthLetterOrDigit) {
        result += String.fromCharCode(code - 65248);
      } else {
        result += str.charAt(i);
      }
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

// 核心净化函数定义
function purifyChinese(text) {
  if (!text) return "";
  
  // 0. 先将全角英文字母与数字转换为半角
  text = toDBC(text);
  
  // 1. 按原始换行分割成行
  const rawLines = text.split('\n');
  const processedLines = [];
  
  // 2. 清理每行内的多余空格
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    
    // 去除汉字/中文标点之间的莫名空格
    line = line.replace(/(?<=[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, "");
    // 中英文边界处规范化地加单个空格
    line = line.replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, "$1 $2");
    line = line.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, "$1 $2");
    
    processedLines.push(line);
  }
  
  const paragraphs = [];
  let currentParagraph = "";
  
  for (let i = 0; i < processedLines.length; i++) {
    const line = processedLines[i];
    
    // 遇到本就是空行的情况，判定分段
    if (line === "") {
      if (currentParagraph !== "") {
        paragraphs.push(currentParagraph);
        currentParagraph = "";
      }
      continue;
    }
    
    if (currentParagraph === "") {
      currentParagraph = line;
    } else {
      let shouldBreak = false;
      
      // 获取上一行的清洗后文本及最后一个字符
      const prevLine = processedLines[i - 1] || "";
      const lastChar = prevLine.slice(-1);
      
      // 智能分段判断规则：
      // 1. 上一行以句末标点结尾（允许后面带类似 [1] 的引用标号），且整行长度较短（小于 35 个字），极有可能是段落结束
      if (/([。？！?!；;]|\.\s*)\s*(?:\[\d+\])?$/.test(prevLine) && prevLine.length < 35) {
        shouldBreak = true;
      }
      // 2. 上一行极短（小于 12 个字），且该行不包含任何主要句中/句末标点（如逗号、句号、冒号等，括号除外），通常是小标题或段首句
      else if (prevLine.length < 12 && !/[，。？！、：；,.:;!?]/.test(prevLine)) {
        shouldBreak = true;
      }
      // 3. 当前行本身是以明显的段落/列表标记、或者标题序号开头
      // 例如：“（一）”、“一、”、“1.”、“[1]”、“-”、“•” 等
      else if (/^(?:[（\(][一二三四五六七八九十0-9]+[）\)]|[一二三四五六七八九十]+[、]|[0-9]+[\.、]|[-•●\*]|\u25cf)/.test(line)) {
        shouldBreak = true;
      }
      
      if (shouldBreak) {
        paragraphs.push(currentParagraph);
        currentParagraph = line;
      } else {
        // 合并：中文字符之间不加换行和空格
        currentParagraph += line;
      }
    }
  }
  
  if (currentParagraph !== "") {
    paragraphs.push(currentParagraph);
  }
  
  return paragraphs.join("\n\n");
}

function purifyEnglish(text) {
  if (!text) return "";
  // 0. 先将全角英文字母与数字转换为半角
  text = toDBC(text);
  // 1. 合并英文连字符 + 换行 (例如 hyphen-\nated 转换为 hyphenated)
  let processed = text.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");
  
  // 2. 保留双换行及以上作为段落分隔
  processed = processed.replace(/\n\n+/g, "【段落占位】");
  
  // 3. 将单换行替换为空格
  processed = processed.replace(/\n/g, " ");
  
  // 4. 将两个以上的空格合并为单空格
  processed = processed.replace(/\s{2,}/g, " ");
  
  // 还原段落换行
  processed = processed.replace(/【段落占位】/g, "\n\n");
  
  return processed.trim();
}

function purifyText(text, mode) {
  if (!text) return "";
  if (mode === "zh") return purifyChinese(text);
  if (mode === "en") return purifyEnglish(text);
  
  // 自动检测模式：统计中文字符比例是否超过 10%
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const totalLength = text.length;
  const chineseRatio = chineseChars ? (chineseChars.length / totalLength) : 0;
  
  return chineseRatio > 0.1 ? purifyChinese(text) : purifyEnglish(text);
}

// TDD 测试函数
function runCleanerTests() {
  console.group("🧪 核心净化规则单元测试");
  
  // 测试用例 1: 中文段落与空格去除
  const inputZh = "我 们  在 看 文  献 ，\n 粘贴  的时 候 总 是 带着 原 有 的 格式 。\n\n这 是 第二段。";
  const expectedZh = "我们在看文献，粘贴的时候总是带着原有的格式。\n\n这是第二段。";
  const resultZh = purifyText(inputZh, "zh");
  console.assert(resultZh === expectedZh, `[ZH] 预期:\n"${expectedZh}"\n但得到:\n"${resultZh}"`);

  // 测试用例 2: 英文断词与连字符拼接
  const inputEn = "This is a very import-\nant doc-\nument for our re-\nsearch work.\n\nHere is paragraph two.";
  const expectedEn = "This is a very important document for our research work.\n\nHere is paragraph two.";
  const resultEn = purifyText(inputEn, "en");
  console.assert(resultEn === expectedEn, `[EN] 预期:\n"${expectedEn}"\n但得到:\n"${resultEn}"`);

  // 测试用例 3: 自动识别中英文
  const autoZh = purifyText("我 们 的 论 文", "auto");
  console.assert(autoZh === "我们的论文", "自动识别中文模式失败");
  
  const autoEn = purifyText("Sci-\nentific pa- \n per", "auto");
  console.assert(autoEn === "Scientific paper", "自动识别英文模式失败");

  // 测试用例 4: 全角转半角与中英加空格
  const inputDbc = "ＩＡＣＳ是一个非盈利专业组织，设立于１９７１年。";
  const expectedDbc = "IACS 是一个非盈利专业组织，设立于 1971 年。";
  const resultDbc = purifyText(inputDbc, "zh");
  console.assert(resultDbc === expectedDbc, `[DBC] 预期:\n"${expectedDbc}"\n但得到:\n"${resultDbc}"`);

  console.log("✅ 所有核心算法测试完成！");
  console.groupEnd();
}

// 仅在浏览器环境下执行 DOM 绑定
if (typeof window !== 'undefined') {
  // 暴露接口便于控制台调试
  window.runCleanerTests = runCleanerTests;
  window.purifyText = purifyText;

  document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const outputArea = document.getElementById('output-area');
    const inputWordCount = document.getElementById('input-word-count');
    const outputWordCount = document.getElementById('output-word-count');
    const switchAutoCopy = document.getElementById('switch-auto-copy');
    const btnCopy = document.getElementById('btn-copy');
    const btnClear = document.getElementById('btn-clear');
    
    // 头部及抽屉控制节点
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const btnToggleHistory = document.getElementById('btn-toggle-history');
    const drawer = document.getElementById('history-drawer');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const historyList = document.getElementById('history-list');
    const btnClearHistory = document.getElementById('btn-clear-history');
    
    // 翻译节点
    const btnTranslateGoogle = document.getElementById('btn-translate-google');
    const btnTranslateDeepl = document.getElementById('btn-translate-deepl');

    let historyItems = JSON.parse(localStorage.getItem('purifier_history') || '[]');

    // 获取当前选中的模式
    function getSelectedMode() {
      return document.querySelector('input[name="purify-mode"]:checked').value;
    }

    // 核心处理与更新逻辑
    function handleProcessing() {
      const rawText = inputArea.value;
      const mode = getSelectedMode();
      const purified = purifyText(rawText, mode);
      
      outputArea.value = purified;
      
      // 字数更新
      inputWordCount.textContent = `字数: ${rawText.length}`;
      outputWordCount.textContent = `字数: ${purified.length}`;
      
      // 自动复制
      if (switchAutoCopy.checked && purified.trim() !== '') {
        performCopy(purified, true);
      }

      // 添加历史记录
      addHistoryItem(rawText);
    }

    // 复制逻辑
    function performCopy(text, isAuto = false) {
      if (!navigator.clipboard) {
        if (!isAuto) alert("当前环境不支持 Clipboard API，请手动复制右侧框中文本。");
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        if (isAuto) {
          // 自动复制成功闪烁绿边框
          outputArea.classList.add('auto-copy-flash');
          setTimeout(() => outputArea.classList.remove('auto-copy-flash'), 1000);
        } else {
          // 手动复制更改按钮文字
          const oldText = btnCopy.textContent;
          btnCopy.textContent = "已复制！";
          btnCopy.classList.add('btn-success');
          setTimeout(() => {
            btnCopy.textContent = oldText;
            btnCopy.classList.remove('btn-success');
          }, 1500);
        }
      }).catch(err => {
        console.error("复制失败:", err);
      });
    }

    // 历史记录渲染
    function updateHistoryUI() {
      historyList.innerHTML = '';
      if (historyItems.length === 0) {
        historyList.innerHTML = '<li class="empty-tip" style="color: var(--text-sub); text-align: center; margin-top: 20px; list-style: none;">暂无历史记录</li>';
        return;
      }
      historyItems.forEach((item) => {
        const li = document.createElement('li');
        li.style.cssText = 'padding: 12px; border-bottom: 1px solid var(--panel-border); cursor: pointer; transition: background 0.2s; border-radius: 8px; margin-bottom: 8px; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; list-style: none;';
        li.addEventListener('mouseover', () => li.style.background = 'rgba(255,255,255,0.05)');
        li.addEventListener('mouseout', () => li.style.background = 'transparent');
        
        const summary = item.length > 25 ? item.substring(0, 25) + '...' : item;
        li.textContent = summary;
        li.title = item;
        
        li.addEventListener('click', () => {
          inputArea.value = item;
          handleProcessing();
          drawer.classList.remove('open');
        });
        historyList.appendChild(li);
      });
    }

    // 新增历史记录（带防抖）
    let saveTimeout = null;
    function addHistoryItem(text) {
      if (!text || text.trim() === '') return;
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        historyItems = historyItems.filter(item => item !== text);
        historyItems.unshift(text);
        if (historyItems.length > 10) historyItems.pop();
        localStorage.setItem('purifier_history', JSON.stringify(historyItems));
        updateHistoryUI();
      }, 1000);
    }

    // 事件绑定
    inputArea.addEventListener('input', handleProcessing);
    
    document.querySelectorAll('input[name="purify-mode"]').forEach(radio => {
      radio.addEventListener('change', handleProcessing);
    });

    btnCopy.addEventListener('click', () => {
      if (outputArea.value.trim() !== '') {
        performCopy(outputArea.value, false);
      }
    });

    btnClear.addEventListener('click', () => {
      inputArea.value = '';
      outputArea.value = '';
      inputWordCount.textContent = "字数: 0";
      outputWordCount.textContent = "字数: 0";
      inputArea.focus();
    });

    // 抽屉控制
    btnToggleHistory.addEventListener('click', () => drawer.classList.add('open'));
    btnCloseHistory.addEventListener('click', () => drawer.classList.remove('open'));
    
    // 清空历史
    btnClearHistory.addEventListener('click', () => {
      historyItems = [];
      localStorage.removeItem('purifier_history');
      updateHistoryUI();
    });

    // 主题切换
    btnToggleTheme.addEventListener('click', () => {
      const currentBg = document.documentElement.style.getPropertyValue('--bg-color');
      if (currentBg === '#f8fafc') {
        document.documentElement.style.setProperty('--bg-color', '#080b11');
        document.documentElement.style.setProperty('--text-main', '#f1f5f9');
        document.documentElement.style.setProperty('--text-sub', '#94a3b8');
        document.documentElement.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.03)');
        document.documentElement.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.08)');
      } else {
        document.documentElement.style.setProperty('--bg-color', '#f8fafc');
        document.documentElement.style.setProperty('--text-main', '#0f172a');
        document.documentElement.style.setProperty('--text-sub', '#64748b');
        document.documentElement.style.setProperty('--panel-bg', 'rgba(0, 0, 0, 0.02)');
        document.documentElement.style.setProperty('--panel-border', 'rgba(0, 0, 0, 0.08)');
      }
    });

    // 翻译链接绑定
    btnTranslateGoogle.addEventListener('click', () => {
      const text = outputArea.value;
      if (text.trim() === '') return;
      window.open(`https://translate.google.com/?sl=auto&tl=zh-CN&text=${encodeURIComponent(text)}&op=translate`, '_blank');
    });

    btnTranslateDeepl.addEventListener('click', () => {
      const text = outputArea.value;
      if (text.trim() === '') return;
      window.open(`https://www.deepl.com/translator#auto/zh-cn/${encodeURIComponent(text)}`, '_blank');
    });

    // 初始化历史记录UI
    updateHistoryUI();
  });
} else {
  // Node.js 环境下直接运行测试
  runCleanerTests();
}
