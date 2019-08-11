const unified = require('unified')
const parseMarkdown = require('remark-parse')
const extractFrontmatter = require('remark-extract-frontmatter')
const parseFrontmatter = require('remark-frontmatter')
const yamlParser = require('yaml').parse
const toHtmlTree = require('remark-rehype')
const toHtmlString = require('rehype-stringify')
const _ = require('lodash')
const parseSpecimenBlocks = require('./specimenBlocks')
const resolveSpecimenBlockImports = require('../transform/resolveSpecimenBlockImports')
const addSpecimenEmbeds = require('../transform/addSpecimenEmbeds')
const removeHiddenCodeBlocks = require('../transform/removeHiddenCodeBlocks')

module.exports = (markdown, { dirpath = null, webpackMode = null, iframePathFn = null } = {}) =>
	new Promise((resolve, reject) => {
		unified()
			.use(parseMarkdown)
			.use(parseFrontmatter)
			.use(extractFrontmatter, { name: 'frontmatter', yaml: yamlParser })
			.use(parseSpecimenBlocks)
			.use(resolveSpecimenBlockImports, { dirpath, webpackMode })
			.use(addSpecimenEmbeds)
			.use(removeHiddenCodeBlocks)
			.use(toHtmlTree, {
				handlers: {
					'specimen-embed': (h, node) =>
						iframePathFn
							? h(node, 'iframe', {
									src: iframePathFn({
										componentName: node.componentName,
										specimenName: node.specimenName,
										language: node.language,
									}),
							  })
							: null,
				},
			})
			.use(toHtmlString)
			.process(markdown, (error, file) => {
				if (error) {
					return reject(error)
				}

				if (!file.data.frontmatter || !file.data.frontmatter.name) {
					return resolve(null)
				}

				resolve({
					name: file.data.frontmatter.name,
					meta: _.omit(file.data.frontmatter, 'name'),
					specimens: file.data.specimens,
					contentHtml: file.contents,
				})
			})
	})
