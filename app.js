// 核心净化函数定义
function purifyChinese(text) {
  if (!text) return "";
  // 1. 保留双换行作为段落分界，单换行直接抹除
  let processed = text.replace(/\n\n+/g, "【段落占位】");
  processed = processed.replace(/\n/g, "");
  
  // 2. 去除两个中文字符/标点之间的空格
  // 中文字符与标点的正则范围包含常用汉字 [\u4e00-\u9fa5] 及标点 [\u3000-\u303f\uff00-\uffef]
  processed = processed.replace(/(?<=[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])\s+(?=[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef])/g, "");
  
  // 3. 将中英文交界处如果没有空格的，自动加空格以规范排版
  processed = processed.replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, "$1 $2");
  processed = processed.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, "$1 $2");
  
  // 还原段落换行
  processed = processed.replace(/【段落占位】/g, "\n\n");
  
  return processed.trim();
}

function purifyEnglish(text) {
  if (!text) return "";
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
  const inputZh = "我 们  在 看 文  献\n。 粘贴  的时 候 总 是 带着 \n 格式 。\n\n这 是 第二段。";
  const expectedZh = "我们在看文献。粘贴的时候总是带着格式。\n\n这是第二段。";
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
  });
} else {
  // Node.js 环境下直接运行测试
  runCleanerTests();
}
