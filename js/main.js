let myChart = echarts.init(document.getElementById('sankey-container'));
let pieChart = echarts.init(document.getElementById('pie-chart'));

const files = {
    unmerged: 'data/未合併源.xlsx',
    merged: 'data/已合併源.xlsx'
};

// 初始化加载
loadData(files.unmerged);

// 按钮切换逻辑
document.getElementById('btn-unmerged').onclick = function() {
    switchActive(this);
    loadData(files.unmerged);
};
document.getElementById('btn-merged').onclick = function() {
    switchActive(this);
    loadData(files.merged);
};

function switchActive(el) {
    document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
}

async function loadData(filePath) {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 读取第一个工作表
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    
    renderCharts(jsonData);
}

function renderCharts(data) {
    let nodes = [];
    let links = [];
    let linkMap = {};

    // 假设 Excel 列名：'韵字','上古韵部', '中古韵部' 
    data.forEach(item => {
        const char = item['韵字'] || item['代表字'];
        const source = item['上古韵部'] + '(上古)';
        const target = item['中古韵部'] + '(中古)';

        // 收集节点
        if (!nodes.find(n => n.name === source)) nodes.push({ name: source });
        if (!nodes.find(n => n.name === target)) nodes.push({ name: target });

        // 收集连线数据
        const key = `${source}->${target}`;
        if (!linkMap[key]) {
            linkMap[key] = { source, target, value: 0, chars: [] };
        }
        linkMap[key].value += 1;
        linkMap[key].chars.push(char);
    });

    links = Object.values(linkMap);

    // 1. 桑基图配置
    const sankeyOption = {
        title: { text: '韵部演变流向图' },
        tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            formatter: function (params) {
                if (params.dataType === 'edge') {
                    // 核心需求：显示具体字
                    const charList = params.data.chars.join('、');
                    return `${params.data.source} → ${params.data.target}<br/>
                            数量：<b>${params.data.value}</b><br/>
                            具体字：<div style="white-space:normal; width:200px;">${charList}</div>`;
                }
                return `${params.name}: ${params.value}`;
            }
        },
        series: [{
            type: 'sankey',
            data: nodes,
            links: links,
            emphasis: { focus: 'adjacency' },
            lineStyle: { color: 'source', curveness: 0.5 }
        }]
    };

    // 2. 饼图配置（展示上古韵部比例）
    const sourceCounts = {};
    data.forEach(item => {
        sourceCounts[item['上古韵部']] = (sourceCounts[item['上古韵部']] || 0) + 1;
    });
    
    const pieOption = {
        title: { text: '上古韵部字数分布', left: 'center' },
        series: [{
            type: 'pie',
            radius: '50%',
            data: Object.keys(sourceCounts).map(k => ({ name: k, value: sourceCounts[k] }))
        }]
    };

    myChart.setOption(sankeyOption);
    pieChart.setOption(pieOption);
}

// 窗口自适应
window.onresize = () => {
    myChart.resize();
    pieChart.resize();
};