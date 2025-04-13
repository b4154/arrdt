export function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
	for (let i = 0; i < arr.length; i += n) {
	  yield arr.slice(i, i + n);
	}
}

export async function findAsync<T>(
	array: T[],
	predicate: (t: T) => Promise<boolean>,
  ): Promise<T | undefined> {
	for (const t of array) {
	  if (await predicate(t)) {
		return t;
	  }
	}
	return undefined;
}

export async function resolvePromisesSeq (tasks) {
	const results = [];
	for (const task of tasks) {
	  results.push(await task);
	}
  
	return results;
};