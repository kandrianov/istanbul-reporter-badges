const fs = require('fs');
const path = require('path');
const os = require('os');


const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

const strictEncodeURIComponent = str => encodeURIComponent(str)
    .replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16)}`);

class InstanbulReporterBadges {
    constructor({ readmeFilename = 'README.md', levelRange = [50, 85] }) {
        this.readmeFilePath = path.join(process.cwd(), readmeFilename);

        this.levelsRange = levelRange;

        this.colors = {
            low: 'red',
            medium: 'yellow',
            high: 'brightgreen',
        };
    }

    _getMetricLevel(metric) {
        if (metric.pct >= this.levelsRange[1]) return 'high';
        if (metric.pct >= this.levelsRange[0]) return 'medium';
        return 'low';
    }

    _getBargeUrl(coverageType, metric) {
        const base = 'https://img.shields.io/badge/';
        const caption = strictEncodeURIComponent(capitalizeFirstLetter(coverageType));
        const value = strictEncodeURIComponent(`${metric.pct}% (${metric.covered}/${metric.total})`);
        const level = this._getMetricLevel(metric);
        const color = this.colors[level];

        return `${base}${caption}-${value}-${color}.svg`;
    }

    _getBadgeMarkdown(coverageType, metric) {
        const badgeUrl = this._getBargeUrl(coverageType, metric);

        return `![coverage-${coverageType}-badge](${badgeUrl})`;
    }

    _prepareContent(fileContent, summary) {
        return Object.keys(summary).reverse().reduce((content, metric) => {
            const re = new RegExp(`!\\[coverage-${metric}-badge\\]\\([^)]+\\)`, 'gi');

            const badgeMarkdown = this._getBadgeMarkdown(metric, summary[metric]);

            if (re.test(content)) return content.replace(re, badgeMarkdown);

            return `${badgeMarkdown}${os.EOL}${content}`;
        }, fileContent);
    }

    onStart(root) {
        const { data } = root.getCoverageSummary();

        if (fs.existsSync(this.readmeFilePath)) {
            const readmeContent = fs.readFileSync(this.readmeFilePath, 'utf8');

            const updatedReadmeContent = this._prepareContent(readmeContent, data);

            fs.writeFileSync(this.readmeFilePath, updatedReadmeContent);
        }
    }
}

module.exports = InstanbulReporterBadges;
