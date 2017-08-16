export enum ResourceType {
    JSON,
    BIN,
    Image
}

class ResourceGroup {
    public name: string = "";
    public keys: string = "";
}

class Resource {
    public name: string = "";
    public type: string = "";
    public url: string = "";
}

export class ResourceJSON {
    public readonly resources: Resource[] = [];
    public readonly groups: ResourceGroup[] = [];

    public clear(): void {
        this.resources.length = 0;
        this.groups.length = 0;
    }

    public getResource(name: string): Resource | null {
        for (let i = 0, l = this.resources.length; i < l; ++i) {
            const resource = this.resources[i];
            if (resource.name === name) {
                return resource;
            }
        }
        return null;
    }

    public getResourceGroup(name: string): ResourceGroup | null {
        for (let i = 0, l = this.groups.length; i < l; ++i) {
            const group = this.groups[i];
            if (group.name === name) {
                return group;
            }
        }
        return null;
    }

    public addResource(name: string, type: ResourceType, url: string, ...groupNames: string[]): void {
        const resource = this.getResource(name) || new Resource();

        resource.name = name;
        resource.type = ResourceType[type].toLowerCase();
        resource.url = url;

        if (this.resources.indexOf(resource) < 0) {
            this.resources.push(resource);
        }

        if (groupNames && groupNames.length) {
            for (let i = 0, l = groupNames.length; i < l; ++i) {
                const groupName = groupNames[i];
                const resourceGroup = this.getResourceGroup(groupName) || new ResourceGroup();
                resourceGroup.name = groupName;

                if (resourceGroup.keys) {
                    const keys = resourceGroup.keys.split(",");
                    if (keys.indexOf(name) < 0) {
                        keys.push(name);
                    }

                    resourceGroup.keys = keys.join(",");
                }
                else {
                    resourceGroup.keys = name;
                }

                if (this.groups.indexOf(resourceGroup) < 0) {
                    this.groups.push(resourceGroup);
                }
            }
        }
    }
}