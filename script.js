document.addEventListener('DOMContentLoaded', function () {
    const isEditPage = window.location.pathname.includes('edit.html');
    const isIndexPage = window.location.pathname.includes('index.html');

    if (isEditPage) {
        const editor = document.getElementById('editor');
        const preview = document.getElementById('preview');
        const suggestions = document.getElementById('suggestions');
        const suggestionSearch = document.getElementById('suggestion-search');
        const suggestionList = document.getElementById('suggestion-list');
        const allSuggestions = Array.from(suggestionList.children);
        const themeSwitch = document.getElementById('theme-switch');
        const saveTagBtn = document.getElementById('save-tag');

        // 渲染Markdown的函数，预处理引用块
        function renderMarkdown() {
            let markdown = editor.value;
            let lines = markdown.split('\n');
            let processedLines = [];
            let inBlockquote = false;

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trimStart();
                // 如果当前行以 > 开头，标记为引用块
                if (line.startsWith('>')) {
                    inBlockquote = true;
                    processedLines.push(lines[i]);
                } else {
                    // 如果当前行不以 > 开头，且之前在引用块中，终止引用
                    if (inBlockquote && line !== '') {
                        inBlockquote = false;
                        // 确保引用块后有空行
                        if (i > 0 && processedLines[processedLines.length - 1] !== '') {
                            processedLines.push('');
                        }
                    }
                    processedLines.push(lines[i]);
                }
            }

            // 重新组合处理后的内容并渲染
            markdown = processedLines.join('\n');
            const html = marked.parse(markdown, { breaks: true });
            preview.innerHTML = html;
        }

        // 删除光标前的 "/"
        function removeSlashBeforeCursor() {
            const start = editor.selectionStart;
            const value = editor.value;
            if (value[start - 1] === '/') {
                editor.value = value.substring(0, start - 1) + value.substring(start);
                editor.selectionStart = editor.selectionEnd = start - 1;
            }
        }

        // 插入文本到光标位置
        function insertAtCursor(text, cursorOffset = 0) {
            removeSlashBeforeCursor();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const value = editor.value;
            // 针对 blockquote 特殊处理，添加空行以终止引用
            if (text === '> ') {
                text = '> \n\n'; // 在引用后添加空行
                cursorOffset = -2; // 调整光标位置到引用行末
            }
            editor.value = value.substring(0, start) + text + value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + text.length + cursorOffset;
            editor.focus();
            renderMarkdown();
        }

        // 显示或隐藏建议菜单
        function toggleSuggestions(show) {
            suggestions.style.display = show ? 'block' : 'none';
            if (show) {
                suggestionSearch.value = '';
                filterSuggestions('');
                suggestionSearch.focus();
                updateSelectedItem(-1); // 重置选中项
            }
        }

        // 过滤建议项并返回可见项
        function filterSuggestions(query) {
            const visibleItems = [];
            allSuggestions.forEach(item => {
                const text = item.textContent.toLowerCase();
                const isVisible = text.includes(query.toLowerCase());
                item.style.display = isVisible ? 'block' : 'none';
                if (isVisible) visibleItems.push(item);
            });
            return visibleItems;
        }

        // 更新选中项
        let selectedIndex = -1;
        function updateSelectedItem(newIndex) {
            const visibleItems = filterSuggestions(suggestionSearch.value);
            if (visibleItems.length === 0) return;

            // 移除之前的选中样式
            allSuggestions.forEach(item => item.classList.remove('selected'));

            // 限制索引范围
            if (newIndex < 0) newIndex = 0;
            if (newIndex >= visibleItems.length) newIndex = visibleItems.length - 1;
            selectedIndex = newIndex;

            // 应用选中样式
            if (selectedIndex >= 0) {
                visibleItems[selectedIndex].classList.add('selected');
                // 确保选中项可见
                visibleItems[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        // 触发选中项
        function triggerSelectedItem() {
            const visibleItems = filterSuggestions(suggestionSearch.value);
            if (selectedIndex >= 0 && selectedIndex < visibleItems.length) {
                const action = visibleItems[selectedIndex].dataset.action;
                if (action === 'heading1') insertAtCursor('# ');
                else if (action === 'heading2') insertAtCursor('## ');
                else if (action === 'heading3') insertAtCursor('### ');
                else if (action === 'heading4') insertAtCursor('#### ');
                else if (action === 'heading5') insertAtCursor('##### ');
                else if (action === 'heading6') insertAtCursor('###### ');
                else if (action === 'paragraph') insertAtCursor('\n\n');
                else if (action === 'blockquote') insertAtCursor('> ');
                else if (action === 'codeblock') insertAtCursor('```\n\n```', -4);
                else if (action === 'list-unordered') insertAtCursor('- ');
                else if (action === 'list-ordered') insertAtCursor('1. ');
                else if (action === 'divider') insertAtCursor('---\n');
                else if (action === 'image') insertAtCursor('![]()', -2);
                else if (action === 'link') insertAtCursor('[]()', -2);
                else if (action === 'bold') insertAtCursor('** **', -2);
                else if (action === 'italic') insertAtCursor('* *', -2);
                else if (action === 'strikethrough') insertAtCursor('~~ ~~', -2);
                else if (action === 'table') insertAtCursor('| 头1 | 头2 |\n| --- | --- |\n| 单元格1 | 单元格2 |\n\n');
                else if (action === 'inline-code') insertAtCursor('` `', -2);
                else if (action === 'task-list') insertAtCursor('- [ ] ');
                toggleSuggestions(false);
                editor.focus();
            }
        }

        // 保存标签功能
        saveTagBtn.addEventListener('click', function () {
            const content = editor.value;
            if (!content.trim()) {
                alert('请输入内容后再保存！');
                return;
            }
            const urlParams = new URLSearchParams(window.location.search);
            const tagIndex = urlParams.get('tagIndex');
            const tags = JSON.parse(localStorage.getItem('markdownTags') || '[]');
            const timestamp = new Date().toLocaleString('zh-CN');

            if (tagIndex !== null && tags[tagIndex]) {
                const choice = confirm('选择保存方式：\n点击“确定”覆盖原有标签\n点击“取消”保存至新标签');
                if (choice) {
                    // 覆盖原有标签
                    tags[tagIndex].content = content;
                    tags[tagIndex].timestamp = timestamp;
                    localStorage.setItem('markdownTags', JSON.stringify(tags));
                    alert('保存成功！');
                    editor.value = '';
                    renderMarkdown();
                    window.location.href = 'index.html'; // 返回首页
                } else {
                    // 保存至新标签
                    const tagName = prompt('请输入新标签名称：');
                    if (tagName && tagName.trim()) {
                        tags.push({ name: tagName.trim(), content, timestamp });
                        localStorage.setItem('markdownTags', JSON.stringify(tags));
                        alert('保存成功！');
                        editor.value = '';
                        renderMarkdown();
                        window.location.href = 'index.html'; // 返回首页
                    } else if (tagName !== null) {
                        alert('标签名称不能为空！');
                    }
                }
            } else {
                // 新建标签
                const tagName = prompt('请输入标签名称：');
                if (tagName && tagName.trim()) {
                    tags.push({ name: tagName.trim(), content, timestamp });
                    localStorage.setItem('markdownTags', JSON.stringify(tags));
                    alert('保存成功！');
                    editor.value = '';
                    renderMarkdown();
                    window.location.href = 'index.html'; // 返回首页
                } else if (tagName !== null) {
                    alert('标签名称不能为空！');
                }
            }
        });

        // 监听输入事件以显示建议菜单
        editor.addEventListener('input', function () {
            renderMarkdown();
            const cursorPos = editor.selectionStart;
            const textBeforeCursor = editor.value.substring(0, cursorPos);

            // 显示建议菜单逻辑
            if (textBeforeCursor.endsWith('/')) {
                toggleSuggestions(true);
            } else {
                toggleSuggestions(false);
            }
        });

        // 监听搜索框输入
        suggestionSearch.addEventListener('input', function () {
            updateSelectedItem(-1); // 重置选中项
            filterSuggestions(this.value);
        });

        // 监听搜索框键盘事件
        suggestionSearch.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateSelectedItem(selectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateSelectedItem(selectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                triggerSelectedItem();
            } else if (e.key === 'Escape') {
                toggleSuggestions(false);
                editor.focus();
            }
        });

        // 监听建议菜单点击事件
        suggestionList.addEventListener('click', function (e) {
            const action = e.target.dataset.action;
            if (action === 'heading1') insertAtCursor('# ');
            else if (action === 'heading2') insertAtCursor('## ');
            else if (action === 'heading3') insertAtCursor('### ');
            else if (action === 'heading4') insertAtCursor('#### ');
            else if (action === 'heading5') insertAtCursor('##### ');
            else if (action === 'heading6') insertAtCursor('###### ');
            else if (action === 'paragraph') insertAtCursor('\n\n');
            else if (action === 'blockquote') insertAtCursor('> ');
            else if (action === 'codeblock') insertAtCursor('```\n\n```', -4);
            else if (action === 'list-unordered') insertAtCursor('- ');
            else if (action === 'list-ordered') insertAtCursor('1. ');
            else if (action === 'divider') insertAtCursor('---\n');
            else if (action === 'image') insertAtCursor('![]()', -2);
            else if (action === 'link') insertAtCursor('[]()', -2);
            else if (action === 'bold') insertAtCursor('** **', -2);
            else if (action === 'italic') insertAtCursor('* *', -2);
            else if (action === 'strikethrough') insertAtCursor('~~ ~~', -2);
            else if (action === 'table') insertAtCursor('| 头1 | 头2 |\n| --- | --- |\n| 单元格1 | 单元格2 |\n\n');
            else if (action === 'inline-code') insertAtCursor('` `', -2);
            else if (action === 'task-list') insertAtCursor('- [ ] ');
            toggleSuggestions(false);
            editor.focus();
        });

        // 点击外部隐藏建议菜单
        document.addEventListener('click', function (e) {
            if (!editor.contains(e.target) && !suggestions.contains(e.target)) {
                toggleSuggestions(false);
            }
        });

        // 切换暗色/明亮模式
        themeSwitch.addEventListener('change', function () {
            document.body.classList.toggle('dark');
            localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        });

        // 加载保存的主题
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeSwitch.checked = true;
        }

        // 检查是否有传入的标签索引并加载内容
        const urlParams = new URLSearchParams(window.location.search);
        const tagIndex = urlParams.get('tagIndex');
        if (tagIndex !== null) {
            const tags = JSON.parse(localStorage.getItem('markdownTags') || '[]');
            if (tags[tagIndex]) {
                editor.value = tags[tagIndex].content;
            }
        } else {
            editor.value = '';
        }
        editor.selectionStart = editor.selectionEnd = editor.value.length;
        editor.focus();
        renderMarkdown();
    }

    if (isIndexPage) {
        const tagList = document.getElementById('tag-list');
        
        function renderTags() {
            const tags = JSON.parse(localStorage.getItem('markdownTags') || '[]');
            tagList.innerHTML = '';
            tags.forEach((tag, index) => {
                const tagItem = document.createElement('div');
                tagItem.className = 'tag-item';
                tagItem.innerHTML = `
                    <span>${tag.name}</span>
                    <div>
                        <span>${tag.timestamp}</span>
                        <button class="delete-btn" data-index="${index}">删除</button>
                    </div>
                `;
                tagItem.querySelector('span:first-child').addEventListener('click', () => {
                    window.location.href = `edit.html?tagIndex=${index}`;
                });
                tagItem.querySelector('.delete-btn').addEventListener('click', () => {
                    if (confirm(`确定要删除标签 "${tag.name}" 吗？`)) {
                        tags.splice(index, 1);
                        localStorage.setItem('markdownTags', JSON.stringify(tags));
                        renderTags();
                    }
                });
                tagList.appendChild(tagItem);
            });
        }

        renderTags();
    }
});
