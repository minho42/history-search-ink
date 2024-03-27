import fs from 'fs';
import os from 'os';
import path from 'path';

import React, {useEffect, useState} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import TextInput from 'ink-text-input';
import {useDebounce} from '@uidotdev/usehooks';
import Fuse from 'fuse.js';
import {exec} from 'child_process';

function copyToClipboard(text) {
	const process = exec('pbcopy');

	process.stdin.write(text);
	process.stdin.end();

	process.on('exit', code => {
		if (code !== 0) {
			console.error('Failed to copy text to clipboard');
		}
	});

	process.stderr.on('data', data => {
		console.error(`stderr: ${data}`);
	});
}

const fuseOptions = {
	// isCaseSensitive: false,
	includeScore: true,
	sortFn: (a, b) => b.score - a.score,
	// shouldSort: true,
	includeMatches: true,
	// findAllMatches: false,
	// minMatchCharLength: 1,
	// location: 0,
	// threshold: 0.6,
	// distance: 100,
	// useExtendedSearch: false,
	// ignoreLocation: false,
	// ignoreFieldNorm: false,
	// fieldNormWeight: 1,
	// keys: ['title', 'author.firstName'],
};

function readHistory() {
	const historyPath = path.join(os.homedir(), '.zsh_history');
	const history = fs.readFileSync(historyPath, {encoding: 'utf8'}).split('\n');
	const commandsSet = new Set();
	history.forEach(line => {
		const commandPart = line.split(';', 2)[1];
		if (commandPart) {
			commandsSet.add(commandPart.trim());
		}
	});
	return Array.from(commandsSet).reverse();
}

const HEIGHT = 12;
export default function App() {
	const histories = readHistory();
	const [query, setQuery] = useState('');
	const [focusIndex, setFocusIndex] = useState(1);
	const debouncedQuery = useDebounce(query, 300);
	const {exit} = useApp();
	const fuse = new Fuse(histories, fuseOptions);
	const [fuzzyHistories, setFuzzyHistories] = useState(histories);
	const [status, setStatus] = useState('');

	useEffect(() => {
		setFocusIndex(1);
		setStatus('');
		setFuzzyHistories(fuse.search(debouncedQuery).reverse().slice(0, HEIGHT));
	}, [debouncedQuery]);

	useInput((input, key) => {
		if (key.escape) {
			exit();
		}
		if (fuzzyHistories.length <= 0) return;

		// TODO somehow index inside fuzzyHistories.map start from 1 not 0

		if (key.upArrow) {
			if (focusIndex - 1 <= 0) {
				setFocusIndex(fuzzyHistories.length - 1);
			} else {
				setFocusIndex(focusIndex - 1);
			}
		}
		if (key.downArrow) {
			if (focusIndex + 1 >= fuzzyHistories.length) {
				setFocusIndex(1);
			} else {
				setFocusIndex(focusIndex + 1);
			}
		}

		if (key.return) {
			const selected = fuzzyHistories[focusIndex].item;
			copyToClipboard(selected);
			setStatus(`${selected}`);
		}
	});

	return (
		<>
			<Box flexDirection="column" borderStyle="round">
				<Box flexDirection="column">
					<Text bold>
						search: <TextInput value={query} onChange={setQuery} />
					</Text>
				</Box>
			</Box>
			<Box height={HEIGHT} flexDirection="column" borderStyle="round">
				<Box flexDirection="column">
					{fuzzyHistories.map((history, index) => (
						<Text key={index} color="green" inverse={index === focusIndex}>
							{/* ({history?.score?.toFixed(4)}) */}
							{history.item}
						</Text>
					))}
				</Box>
			</Box>
			<Box flexDirection="column" borderStyle="round">
				<Box flexDirection="column">
					<Text>status:{status}</Text>
				</Box>
			</Box>
		</>
	);
}
