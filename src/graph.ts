import { Identifier } from "./interface";
import { UpdateGraphError, CycleError } from "./errors";


interface HasNodeID {
    toString(): Identifier
}

function nodeID(obj: HasNodeID): Identifier {
    return obj.toString();
}


export class UpdateGraph {

    _edges: Map<Identifier, Set<Identifier>>;
    _sorted: Map<Identifier, number> | null;

    constructor() {
        // Directed graph: nodes point to other nodes that depend on them
        this._edges = new Map();
        this._sorted = null;
    }

    getNode(node: HasNodeID, createIfNotExists: boolean): [Identifier, Set<Identifier>] {
        const id = nodeID(node);
        const edges = this._edges.get(id);
        if (edges != null) {
            return [id, edges];
        } else if (createIfNotExists) {
            const emptyEdges: Set<Identifier> = new Set();
            this._edges.set(id, emptyEdges);
            return [id, emptyEdges];
        } else throw new UpdateGraphError(
            `node ${id} does not exist`
        );
    }

    addEdge(dependent: HasNodeID, dependency: HasNodeID) {
        const dependentNode = this.getNode(dependent, true)[0];
        const dependencyEdges = this.getNode(dependency, true)[1];
        // Add edge from dependency to dependent node
        dependencyEdges.add(dependentNode);
        this._sorted = null;
    }

    orderOf(node: HasNodeID): number {
        const id = nodeID(node);
        const order = this._order.get(id);
        if (order == null) throw new UpdateGraphError(
            `node ${id} does not exist`
        );
        return order;
    }

    updateOrderedNodesOf(node: HasNodeID): Array<Identifier> {
        const id = nodeID(node);
        const order = this._order;
        // Assume order is properly generated, skip null check for node access
        return this._dfs(id).sort(
            (x, y) => order.get(x)! - order.get(y)!
        );
    }

    get orderedNodes(): Array<Identifier> {
        const order = this._order;
        const nodes = Array.from(this._edges.keys());
        // Assume order is properly generated, skip null check for node access
        return nodes.sort(
            (x, y) => order.get(x)! - order.get(y)!
        );
    }

    get _order(): Map<Identifier, number> {
        if (this._sorted == null) {
            // Determine topological order with dfs-based algorithm:
            // https://en.wikipedia.org/wiki/Topological_sorting#Depth-first_search
            const permanent: Set<Identifier> = new Set();
            const temporary: Set<Identifier> = new Set();
            const visit = (n: Identifier) => {
                if (permanent.has(n)) return;
                if (temporary.has(n)) {
                    const cycle = Array.from(temporary);
                    cycle.slice(cycle.indexOf(n));
                    cycle.push(n);
                    throw new CycleError(cycle.join(" -> "));
                }
                temporary.add(n);
                this._edges.get(n)!.forEach(visit);
                temporary.delete(n);
                permanent.add(n);
            }
            for (const node of this._edges.keys()) {
                visit(node);
            }
            // Assign order: permanent yields items in insertion order, which
            // needs to be reversed for topological order
            this._sorted = new Map();
            let i = permanent.size;
            for (let node of permanent) {
                this._sorted.set(node, i--);
            }
        }
        return this._sorted;
    }

    _dfs(init: Identifier): Array<Identifier> {
        const out: Array<Identifier> = [];
        const visited: Set<Identifier> = new Set();
        const stack: Array<Identifier> = [init];
        while (stack.length > 0) {
            // Condition ensures that pop returns an elements, skip null check
            const current = stack.pop()!;
            if (visited.has(current)) {
                continue;
            }
            out.push(current);
            visited.add(current);
            let targets = this._edges.get(current);
            if (targets != null) {
                for (let target of targets) {
                    stack.push(target);
                }
            }
        }
        return out;
    }

}

