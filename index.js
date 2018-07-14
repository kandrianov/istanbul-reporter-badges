const fs = require('fs');
const path = require('path');


const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

class InstanbulReporterBadges {
    constructor({
                    readmeFilename = 'README.md',
                    levelRange = [50, 85],
                    caption = '###### Coverage summary:\n',
                }) {
        this.readmeFilePath = path.join(process.cwd(), readmeFilename);

        this.levelsRange = levelRange;

        this.colors = {
            low: 'red',
            medium: 'yellow',
            high: 'brightgreen',
        };

        this.caption = caption;
    }

    _getMetricLevel(metric) {
        if (metric.pct >= this.levelsRange[1]) return 'high';
        if (metric.pct >= this.levelsRange[0]) return 'medium';
        return 'low';
    }

    _getBargeUrl(coverageType, metric) {
        const base = 'https://img.shields.io/badge/';
        const caption = encodeURIComponent(capitalizeFirstLetter(coverageType));
        const value = encodeURIComponent(`${metric.pct}% (${metric.covered}/${metric.total})`);
        const level = this._getMetricLevel(metric);
        const color = this.colors[level];

        return `${base}${caption}-${value}-${color}.svg`;
    }

    _getBadgeMarkdown(coverageType, metric) {
        const badgeUrl = this._getBargeUrl(coverageType, metric);

        return `![coverage-${coverageType}-badge](${badgeUrl})`;
    }

    _prepareContent(fileContent, badges) {
        const token = 'COVERAGE BUDGES';
        const commentBegin = '<!--';
        const commentEnd = '-->';
        const beginPattern = `(${commentBegin}\\s*?${token} BEGIN\\s*?${commentEnd}.*?[\\r\\n]+)`;
        const endPattern = `(${commentBegin}\\s*?${token} END\\s*?${commentEnd})`;
        const contentPattern = '[\\s\\S]*?';

        const re = new RegExp(`${beginPattern}${contentPattern}${endPattern}`, 'm');

        const badgesLines = badges.reduce((lines, badge) => `${lines}${badge}\n`, '');
        const innerContent = `${this.caption}${badgesLines}`;
        const updatedContent = fileContent.replace(re, `$1${innerContent}$2`);

        if (!re.test(updatedContent)) {
            return `<!-- ${token} BEGIN -->\n${innerContent}<!-- ${token} END -->\n${fileContent}`;
        }

        return updatedContent;
    }

    onStart(root) {
        const summary = root.getCoverageSummary();

        const coverageTypes = Object.keys(summary.data);

        const badges = coverageTypes
            .map(coverageType => this._getBadgeMarkdown(coverageType, summary.data[coverageType]));

        if (fs.existsSync(this.readmeFilePath)) {
            const readmeContent = fs.readFileSync(this.readmeFilePath, 'utf8');

            const updatedReadmeContent = this._prepareContent(readmeContent, badges);

            fs.writeFileSync(this.readmeFilePath, updatedReadmeContent);
        }
    }
}

module.exports = InstanbulReporterBadges;
