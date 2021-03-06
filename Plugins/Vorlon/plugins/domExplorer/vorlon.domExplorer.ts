﻿module VORLON {
    declare var $: any;
    export class DOMExplorer extends Plugin {

        private _previousSelectedNode: HTMLElement;
        private _internalId = 0;

        constructor() {
            super("domExplorer", "control.html", "control.css");
            this._ready = false;
        }

        public getID(): string {
            return "DOM";
        }

        private _getAppliedStyles(node: HTMLElement): string[] {
            // Style sheets
            var styleNode = new Array<string>();
            var sheets = <any>document.styleSheets;
            var style: CSSStyleDeclaration;
            var appliedStyles = new Array<string>();

            for (var c = 0; c < sheets.length; c++) {

                var rules = sheets[c].rules || sheets[c].cssRules;

                for (var r = 0; r < rules.length; r++) {
                    var rule = rules[r];
                    var selectorText = rule.selectorText;
                    var matchedElts = document.querySelectorAll(selectorText);

                    for (var index = 0; index < matchedElts.length; index++) {
                        var element = matchedElts[index];
                        style = rule.style;
                        if (element === node) {
                            for (var i = 0; i < style.length; i++) {
                                if (appliedStyles.indexOf(style[i]) === -1) {
                                    appliedStyles.push(style[i]);
                                }
                            }
                        }
                    }
                }
            }

            // Local style
            style = node.style;
            if (style) {
                for (index = 0; index < style.length; index++) {
                    if (appliedStyles.indexOf(style[index]) === -1) {
                        appliedStyles.push(style[index]);
                    }
                }
            }

            // Get effective styles
            var winObject = document.defaultView || window;
            for (index = 0; index < appliedStyles.length; index++) {
                var appliedStyle = appliedStyles[index];
                if (winObject.getComputedStyle) {
                    styleNode.push(appliedStyle + ":" + winObject.getComputedStyle(node, "").getPropertyValue(appliedStyle));
                }
            }

            return styleNode;
        }

        private _packageNode(node: any): any {
            node.__internalId = this._internalId;

            var packagedNode = {
                id: node.id,
                name: node.localName,
                classes: node.className,
                styles: this._getAppliedStyles(node),
                internalId: this._internalId++
            };

            return packagedNode;
        }

        private _packageDOM(root: HTMLElement, packagedObject: any): void {
            if (!root.children || root.children.length === 0) {
                return;
            }

            for (var index = 0; index < root.children.length; index++) {
                var node = <HTMLElement>root.children[index];

                var packagedNode = this._packageNode(node);

                this._packageDOM(node, packagedNode);

                if (!packagedObject.children) {
                    packagedObject.children = [];
                }

                packagedObject.children.push(packagedNode);
            }
        }

        private _packageAndSendDOM() {
            this._internalId = 0;

            var packagedObject = this._packageNode(document.body);
            this._packageDOM(document.body, packagedObject);

            Core.Messenger.sendRealtimeMessage(this.getID(), packagedObject, RuntimeSide.Client);
        }

        public startClientSide(): void {
            document.addEventListener("DOMContentLoaded",() => {
                if (Core.Messenger.isConnected) {
                    document.addEventListener("DOMNodeInserted",() => {
                        this.refresh();
                    });

                    document.addEventListener("DOMNodeRemoved",() => {
                        this.refresh();
                    });
                }

                this.refresh();
            });
        }

        private _getElementByInternalId(internalId: string, node: any): any {
            if (node.__internalId === internalId) {
                return node;
            }

            for (var index = 0; index < node.children.length; index++) {
                var result = this._getElementByInternalId(internalId, node.children[index]);

                if (result) {
                    return result;
                }
            }

            return null;
        }

        public onRealtimeMessageReceivedFromDashboardSide(receivedObject: any): void {
            var element = this._getElementByInternalId(receivedObject.order, document.body);

            if (!element) {
                return;
            }

            switch (receivedObject.type) {
                case "select":
                    element.__savedBorder = element.style.border;
                    element.style.border = "2px solid red";
                    break;
                case "unselect":
                    element.style.border = element.__savedBorder;
                    break;
                case "ruleEdit":
                    element.style[receivedObject.property] = receivedObject.newValue;
                    break;
            }
        }

        public refresh(): void {
            Tools.SetImmediate(() => { this._packageAndSendDOM() }); // Give some time for the DOM to rebuild
        }

        // DASHBOARD
        private _containerDiv: HTMLElement;
        private _treeDiv: HTMLElement;
        private _styleView: HTMLElement;
        private _dashboardDiv: HTMLDivElement;
        public startDashboardSide(div: HTMLDivElement = null): void {
            this._dashboardDiv = div;

            this._insertHtmlContentAsync(this._dashboardDiv,(filledDiv) => {
                this._containerDiv = filledDiv;

                this._treeDiv = document.getElementById("treeView");
                this._styleView = document.getElementById("styleView");

                $('.dom-explorer-container').split({
                    orientation: 'vertical',
                    limit: 50,
                    position: '70%'
                });

                this._ready = true;
            });
        }

        private _makeEditable(element: HTMLElement): void {
            element.contentEditable = "true";
            element.focus();
            Tools.AddClass(element, "editable");

            var range = document.createRange();
            range.setStart(element, 0);
            range.setEnd(element, 1);
            window.getSelection().addRange(range);
        }

        private _generateClickableValue(label: HTMLElement, value: string, internalId: string): HTMLElement {
            // Value
            var valueElement = document.createElement("div");
            valueElement.contentEditable = "false";
            valueElement.innerHTML = value || "&nbsp;";
            valueElement.className = "styleValue";

            valueElement.addEventListener("keydown",(evt) => {
                if (evt.keyCode === 13 || evt.keyCode === 9) { // Enter or tab
                    Core.Messenger.sendRealtimeMessage(this.getID(), {
                        type: "ruleEdit",
                        property: label.innerHTML,
                        newValue: valueElement.innerHTML,
                        order: internalId
                    }, RuntimeSide.Dashboard);
                    evt.preventDefault();
                    valueElement.contentEditable = "false";
                    Tools.RemoveClass(valueElement, "editable");
                }
            });

            valueElement.addEventListener("blur",() => {
                valueElement.contentEditable = "false";
                Tools.RemoveClass(valueElement, "editable");
            });

            valueElement.addEventListener("click",() => this._makeEditable(valueElement));

            return valueElement;
        }

        // Generate styles for a selected node
        private _generateStyle(property: string, value:string, internalId: string, editableLabel = false): void {
            var label = document.createElement("div");
            label.innerHTML = property;
            label.className = "styleLabel";
            label.contentEditable = "false";
            this._styleView.appendChild(label);

            var valueElement = this._generateClickableValue(label, value, internalId);

            this._styleView.appendChild(valueElement);

            if (editableLabel) {
                label.addEventListener("blur", () => {
                    label.contentEditable = "false";
                    Tools.RemoveClass(label, "editable");
                });

                label.addEventListener("click", () => {
                    this._makeEditable(label);
                });

                label.addEventListener("keydown", (evt) => {
                    if (evt.keyCode === 13 || evt.keyCode === 9) { // Enter or tab
                        this._makeEditable(valueElement);
                        evt.preventDefault();
                    }
                });
            }
        }

        private _generateStyles(styles: string[], internalId: string): void {
            while (this._styleView.hasChildNodes()) {
                this._styleView.removeChild(this._styleView.lastChild);
            }

            // Current styles
            for (var index = 0; index < styles.length; index++) {
                var style = styles[index];
                var splits = style.split(":");

                this._generateStyle(splits[0], splits[1], internalId);
            }

            // Append add style button
            this._generateButton(this._styleView, "+", "styleButton",(button) => {
                this._styleView.removeChild(button);
                this._generateStyle("property", "value", internalId, true);
                this._styleView.appendChild(button);
            });

        }

        private _appendSpan(parent: HTMLElement, className: string, value: string): void {
            var span = document.createElement("span");
            span.className = className;
            span.innerHTML = value;

            parent.appendChild(span);
        }

        private _generateColorfullLink(link: HTMLAnchorElement, receivedObject: any): void {
            this._appendSpan(link, "nodeTag", "&lt;");
            this._appendSpan(link, "nodeName", receivedObject.name);

            if (receivedObject.id) {
                this._appendSpan(link, "nodeAttribute", " id");
                this._appendSpan(link, "nodeTag", "=\"");
                this._appendSpan(link, "nodeValue", receivedObject.id);
                this._appendSpan(link, "nodeTag", "\"");
            }

            if (receivedObject.classes) {
                this._appendSpan(link, "nodeAttribute", " class");
                this._appendSpan(link, "nodeTag", "=\"");
                this._appendSpan(link, "nodeValue", receivedObject.classes);
                this._appendSpan(link, "nodeTag", "\"");
            }

            this._appendSpan(link, "nodeTag", "&gt;");
        }

        private _generateColorfullClosingLink(link: HTMLElement, receivedObject: any): void {
            this._appendSpan(link, "nodeTag", "&lt;/");
            this._appendSpan(link, "nodeName", receivedObject.name);
            this._appendSpan(link, "nodeTag", "&gt;");
        }

        private _generateButton(parentNode: HTMLElement, text: string, className: string, onClick: (button: HTMLElement) => void) {
            var button = document.createElement("div");
            button.innerHTML = text;
            button.className = className;
            button.addEventListener("click", () => onClick(button));
            parentNode.appendChild(button);
        }

        private _generateTreeNode(parentNode: HTMLElement, receivedObject: any, first = false): void {
            var root = document.createElement("div");
            parentNode.appendChild(root);

            var container = document.createElement("div");

            this._generateButton(root, "-", "treeNodeButton", (button) => {
                if (container.style.display === "none") {
                    container.style.display = "";
                    button.innerHTML = "-";
                } else {
                    container.style.display = "none";
                    button.innerHTML = "+";
                }
            });

            // Main node
            var linkText = document.createElement("a");
            (<any>linkText).__targetInternalId = receivedObject.internalId;

            this._generateColorfullLink(linkText, receivedObject);

            linkText.addEventListener("click",() => {
                if (this._previousSelectedNode) {
                    Tools.RemoveClass(this._previousSelectedNode, "treeNodeSelected");
                    Core.Messenger.sendRealtimeMessage(this.getID(), {
                        type: "unselect",
                        order: (<any>this._previousSelectedNode).__targetInternalId
                    }, RuntimeSide.Dashboard);
                }

                Tools.AddClass(linkText, "treeNodeSelected");
                Core.Messenger.sendRealtimeMessage(this.getID(), {
                    type: "select",
                    order: receivedObject.internalId
                }, RuntimeSide.Dashboard);

                this._generateStyles(receivedObject.styles, receivedObject.internalId);

                this._previousSelectedNode = linkText;
            });

            linkText.href = "#";

            linkText.className = "treeNodeHeader";

            root.appendChild(linkText);
            root.className = first ? "firstTreeNodeText" : "treeNodeText";

            // Tools
            if (receivedObject.id) {
                var toolsLink = document.createElement("a");
                toolsLink.innerHTML = "#";
                toolsLink.className = "treeNodeTools";
                toolsLink.href = "#";

                toolsLink.addEventListener("click",() => {
                    Core.Messenger.sendRealtimeMessage("CONSOLE", {
                        type: "order",
                        order: receivedObject.id
                    }, RuntimeSide.Client, "protocol");
                });

                root.appendChild(toolsLink);
            }

            // Children
            if (receivedObject.children) {
                for (var index = 0; index < receivedObject.children.length; index++) {
                    var childObject = receivedObject.children[index];

                    this._generateTreeNode(container, childObject);
                }
            }

            if (receivedObject.name) {
                var closingLink = document.createElement("div");
                closingLink.className = "treeNodeClosingText";
                this._generateColorfullClosingLink(closingLink, receivedObject);

                container.appendChild(closingLink);
            }

            root.appendChild(container);
        }

        public onRealtimeMessageReceivedFromClientSide(receivedObject: any): void {
            while (this._treeDiv.hasChildNodes()) {
                this._treeDiv.removeChild(this._treeDiv.lastChild);
            }

            this._generateTreeNode(this._treeDiv, receivedObject, true);
        }
    }

    // Register
    Core.RegisterPlugin(new DOMExplorer());
}
