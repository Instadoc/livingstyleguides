const visit = require('unist-util-visit')
const extractFrontmatter = require('gray-matter')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const extractNameAndLanguage = string => {
	const matches = /(.+)\.([^.]+)$/.exec(string || '') // Matches `(specimenName).(language)`
	return matches ? matches.slice(1) : []
}

module.exports = () => (tree, file) => {
	const specimenBlocks = []

	visit(tree, 'code', node => {
		const [specimenName, language] = extractNameAndLanguage(node.lang)

		if (!specimenName) {
			return
		}

		const parsed = extractFrontmatter(node.value)
		const displayContent = parsed.content
		const props = parsed.data

		// Converts "alpha beta" to { alpha: true, beta: true }
		const meta = (node.meta || '').trim().split(' ')
		const flags = _(meta)
			.compact()
			.keyBy(flag => flag)
			.mapValues(flag => true)
			.value()

		specimenBlocks.push({
			specimenName,
			language,
			flags,
			props,
			displayContent,
		})

		node.value = displayContent
		node.flags = flags
	})

	file.data.specimens = _(specimenBlocks)
		.groupBy('specimenName')
		.map((blocks, specimenName) => ({
			name: specimenName,
			blocks,
		}))
		.value()
}
