<template>
  <div class="grid" :class="background">
    <div class="slot-desc">
      <div class="btnWrapper" >
        <button class="btn" @click="activeTab = i" v-for="(name, i) in tabs" :key="i" :class="{active: activeTab === i}">{{ name }}</button>
      </div>
      <div :class="{visibleDesc: activeTab === i}" class="description" v-for="(name, i) in tabs" :key="i">
        <slot :name="`slot-desc-${i}`"/>
      </div>
    </div>
    <div :class="{visibleCode: activeTab === i}" class="slot-code" v-for="(name, i) in tabs" :key="i">
      <slot :name="`slot-code-${i}`" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'slot-helper',
  props: {
	tabs: {
      type: Array,
      required: true,
    },
    background: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeTab: 0,
    }
  },
}
</script>

<style lang="stylus" scoped>
@import '../styles/variables.styl';

.description {
	display: none;
	margin-right: -10px;
	margin-bottom: -10px;
}

.btnWrapper {
	margin-bottom:15px;
}

.grid {
	display: flex;
  	height: 100%;
	position: relative;
  	align-items: center;
	border-radius: 1.5rem;
	margin-bottom: 100px;

	&:before {
		content: "";
		width: 100%;
		height: 100%;
		position: absolute;
		background: linear-gradient(45deg, $tipGreenBackground, white);
		border-radius: 1.5rem;
		top: 0;
		left: 0;
		z-index: 0;
	}

	.btn {
		height: auto;
		width: auto;
		border-radius: 1.5rem;
		border: none;
		font-size: 14px;
		padding: 12px;
		margin-right: 8px;
		color:#404040;
		background-color: #F2F2F2;
		&.active {
			background-color:#39a171;
			color:#f3f3f3;
		}
	}

	&.bg-blue {
		flex-direction: row-reverse;
		
		&:before {
			background: linear-gradient(45deg, white, $mainBlueTheme);
		}

		.slot-desc {
			margin-right: 15px;
		}

		.slot-code {
			margin-left: -50px;
		}

		.extra-class {
			pre {
				padding-right:50px;
				margin-right:50px;
			}
		}

		.extra-class:before {
			margin-right:55px;
		}

		.btn {
			&.active {
				background-color: $mainBlueTheme;
			}
		}
	}


	
}

.slot-desc {
	width: 50%;
	height: 250px;
	display: flex;
	flex-direction: column;
	background-color: white;
	border-radius: 1.5rem;
	margin-left: 15px;
	margin-right: -30px;
	padding: 10px;
	overflow: hidden;
	z-index: 2;
}

.slot-code {
	display: none;
	height: 400px;
  	width: 50%;
	border-radius: 1.5rem;
	background-color: #282c34;
	font-size: 13px;
	margin-right: -50px;
	margin-top: 15px;
	margin-bottom: -50px;
	padding-left: 30px;
	z-index: 1;
	margin-top: 15px;
}

.visibleDesc {
	width: 100%;
	display: flex;
	overflow: auto;
	scrollbar-width: thin;
}	

.visibleCode {
	display: flex;

}

.text {
	line-break: normal;
}

.extra-class {
  	display: flex;
	background-color: transparent;
  	width:100%;
	
	pre {
		margin-top: 0;
		margin-bottom: 0;
    	width: 100%;
		scrollbar-width: thin;
	}
}


::-webkit-scrollbar {
	width: 11px;
	height: 11px;
}

::-webkit-scrollbar-button {
	width: 25px;
	height: 25px;
}

::-webkit-scrollbar-thumb {
	border-radius: 10px;
	-webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, .3);
	background-color: #555;
}

::-webkit-scrollbar-track {
	border-radius: 1.5rem;
}

::-webkit-scrollbar-corner {
	background-color: transparent;
}

.theme-dark {
	.slot-desc {
	  background-color: #1a1a1a;
	}

	.grid {
		&:before {
			background: linear-gradient(45deg, #1a1a1a , $tipGreenBackground);
		}

		.btn {
			color:#404040;
			background-color: #F2F2F2;
			&.active {
				background-color:$tipGreenBackground;
				color:#f3f3f3;
			}
		}

		&.bg-blue {
			flex-direction: row-reverse;
			&:before {
				background: linear-gradient(45deg, $mainBlueTheme, #1a1a1a );
			}

			.slot-desc {
				margin-right: 15px;
			}

			.slot-code {
				margin-left: -50px;
			}

			.extra-class {
				pre {
					padding-right:50px;
				}
			}

			.btn {
				&.active {
					background-color: $mainBlueTheme;
				}
			}
		}
	}
	
}

@media only screen and (max-width: $MQNarrow) {
	.slot-desc {
		width:100%;
		height: 350px;
		margin:0;
		z-index: 2;
		box-sizing: border-box;
	}

	.slot-code {
		margin:0;
		width:100%;
		margin-bottom:-50px;
		z-index: 1;
		padding-left:0;
		overflow:hidden;
		box-sizing: border-box;
		.extra-class {
			margin:0;
		}
	}
	.grid {
		flex-direction: column;
		padding:20px;
		.btn {
			width:100%;
			padding: 5px;
			margin-bottom:8px;
		}

		&:before {
			background: linear-gradient(180deg,  $tipGreenBackground, white);
		}
		
		&.bg-blue {
		flex-direction: column;
			&:before {
				background: linear-gradient(180deg, $mainBlueTheme, white);
			}

			.slot-desc {
				margin-right: 0px;
			}

			.slot-code {
				margin-left: 0px;
			}
					
			.btn {
				background-color: #F2F2F2;
				&.active {
					background-color:$mainBlueTheme;
					color:#f3f3f3;
				}
			}

			.extra-class {
				pre {
					margin-right:0px;
				}
			}

			.extra-class:before {
				margin-right:0px;
			}
		}
	}

	.theme-dark{
		.grid { 
			&:before {
				background: linear-gradient(180deg, #1a1a1a,  $tipGreenBackground);
			}

			&.bg-blue {
				flex-direction: column;

				&:before {
					background: linear-gradient(180deg, #1a1a1a, $mainBlueTheme);
				}

				.slot-desc {
					margin: 0px;
				}

				.slot-code {
					margin-left: 0px;
					margin-bottom: -50px;
				}	
			}
		}
	}
}
</style>
