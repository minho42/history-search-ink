import fs from 'fs';
import os from 'os';
import path from 'path';

import React, {useEffect, useState} from 'react';
import {Box, Text, useInput, useApp, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import {useDebounce} from '@uidotdev/usehooks';
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

const HEIGHT = 32;
export default function App() {
	const [history, setHistory] = useState([]);
	const [query, setQuery] = useState('');
	const [focusIndex, setFocusIndex] = useState(0);
	const debouncedQuery = useDebounce(query, 300);
	const {exit} = useApp();
	const [status, setStatus] = useState('');
	const [searchResult, setSearchResult] = useState([]);
	const {stdout} = useStdout();
	const [consoleHeight, setConsoleHeight] = useState(stdout.rows || HEIGHT);

	useEffect(() => {
		setHistory(readHistory());
	}, []);

	useEffect(() => {
		function handleResize() {
			setConsoleHeight(stdout.rows || HEIGHT);
		}
		handleResize();
		process.stdout.on('resize', handleResize);

		return () => {
			process.stdout.off('resize', handleResize);
		};
	}, [stdout.rows]);

	useEffect(() => {
		setFocusIndex(0);
		setStatus('');
		if (debouncedQuery.trim().length > 0) {
			setSearchResult(history.filter(line => line.includes(debouncedQuery)));
		} else {
			setSearchResult([]);
		}
	}, [debouncedQuery]);

	useInput((input, key) => {
		if (key.escape) {
			exit();
		}
		if (searchResult.length <= 0) return;

		if (key.upArrow) {
			if (focusIndex - 1 < 0) {
				setFocusIndex(searchResult.length - 1);
			} else {
				setFocusIndex(focusIndex - 1);
			}
		}
		if (key.downArrow) {
			if (focusIndex + 1 >= searchResult.length) {
				setFocusIndex(0);
			} else {
				setFocusIndex(focusIndex + 1);
			}
		}

		if (key.return) {
			const selected = searchResult[focusIndex];
			// copyToClipboard(selected);
			if (selected) {
				setStatus(`${selected}`);
			}
		}
	});

	return (
		<Box height={consoleHeight} flexDirection="column" borderStyle="round">
			<Box flexShrink={0} flexDirection="column" borderStyle="round">
				<Box flexDirection="column">
					<Text>
						search: <TextInput value={query} onChange={setQuery} />
					</Text>
				</Box>
			</Box>
			<Box flexGrow={1} flexDirection="column" borderStyle="round">
				<Box overflowY="hidden" flexDirection="column">
					{searchResult.map((history, index) => (
						<Text key={index} color="green" inverse={index === focusIndex}>
							{history}
						</Text>
					))}
				</Box>
			</Box>
			<Box flexShrink={0} flexDirection="column" borderStyle="round">
				<Box flexDirection="column">
					<Text>status:{status}</Text>
				</Box>
			</Box>
		</Box>
	);
}
